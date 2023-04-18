import * as vscode from "vscode";
import { getNonce } from "../helpers/getNonce";
import { recursiveDevelopment } from "../AIContainer/recursiveDevelopment";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import { Subtask } from "../AIContainer/recursiveDevelopment";

export class SidebarProvider implements vscode.WebviewViewProvider {
	_view?: vscode.WebviewView;
	_doc?: vscode.TextDocument;
	_state: any = {
		userInput: String, // done
		taskInProgress: Boolean, // done
		taskState: String, // done
		subtasks: Array<Subtask>,
		subtaskStates: Array<String>,
	};

	constructor(private readonly _extensionUri: vscode.Uri) {}

	private _rebuildWebview() {
		if (this._view) {
			this._view.webview.postMessage({
				command: "rebuild",
				state: this._state,
			});
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this._rebuildWebview();
			}
		});

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		this._state.taskInProgress = false;
		var abortController: AbortController | undefined;
		var signal: AbortSignal | undefined;

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (!message.input) {
				return;
			}
			if (!hasValidAPIKey()) {
				vscode.window.showErrorMessage(
					"Please enter a valid API key in the TestWise settings."
				);
				return;
			}

			switch (message.command) {
				case "submit":
					if (this._state.taskInProgress) {
						vscode.window.showInformationMessage(
							"A task is already in progress."
						);
						return;
					}

					abortController = new AbortController();
					signal = abortController.signal;
					this._state.taskInProgress = true;
					this._state.userInput = message.input;
					this._state.subtasks = [];
					this.updateTaskState("started");

					try {
						const result = await recursiveDevelopment(
							message.input,
							signal,
							this.onStartSubtask.bind(this),
							this.onSubtasksReady.bind(this),
							this.onSubtaskError.bind(this)
						);
						if (result === "Cancelled") {
							this.updateTaskState("cancelled");
						} else if (result === "Error") {
							this.updateTaskState("error");
						} else {
							this.updateTaskState("completed");
						}
						this._state.taskInProgress = false;
					} catch (error) {
						vscode.window.showErrorMessage(
							"Error occurred while running task: " + error
						);
						this.updateTaskState("error");
						this._state.taskInProgress = false;
					}
					break;

				case "cancel-task":
					if (!this._state.taskInProgress) {
						vscode.window.showInformationMessage(
							"No task is currently in progress, this should not happen."
						);
						return;
					}
					if (!abortController) {
						throw Error(
							"abortController is undefined, this should not happen."
						);
					}
					abortController.abort();
					break;

				case "onStartSubtask":
					this.onStartSubtask(message.subtask);
					break;

				default:
					throw new Error("Invalid command");
			}
		});
	}

	public revive(panel: vscode.WebviewView) {
		this._view = panel;
	}

	private onStartSubtask(subtask: Subtask) {
		if (this._view) {
			this._view.webview.postMessage({
				command: "onStartSubtask",
				subtask: subtask,
			});
		}
	}

	private async onSubtasksReady(
		subtasks: Array<Subtask>,
		signal: AbortSignal
	): Promise<string> {
		return new Promise((resolve) => {
			const onAbort = () => {
				signal.onabort = null;
				resolve("cancel");
				return;
			};
			signal.onabort = onAbort;

			if (this._view) {
				this.updateTaskState("waiting");
				// update subtask indices
				subtasks.forEach((subtask) => {
					subtask.index += this._state.subtasks.length;
				});
				// update subtasks state
				this._state.subtasks.push(...subtasks);

				// show the new subtasks
				this._view.webview.postMessage({
					command: "showSubtasks",
					subtasks: subtasks,
				});

				this._view.webview.onDidReceiveMessage((message) => {
					if (message.command === "userAction") {
						signal.onabort = null;
						resolve(message.action);
						return;
					}
				});
			}
		});
	}

	private updateTaskState(state: String) {
		this._state.taskState = state;
		if (this._view) {
			this._view.webview.postMessage({
				command: "updateTaskState",
				taskState: state,
			});
		}
	}

	private onSubtaskError() {
		if (this._view) {
			this._view.webview.postMessage({
				command: "onSubtaskError",
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const styleResetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
		);
		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
		);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "src", "sidebar/sidebar.js")
		);
		const styleMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "src", "sidebar/sidebar.css")
		);
		const codiconStylesheetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"node_modules",
				"vscode-codicons",
				"dist",
				"codicon.css"
			)
		);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src ${webview.cspSource}; script-src ${webview.cspSource} 'nonce-${nonce}';">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        		<link href="${styleMainUri}" rel="stylesheet">
				<link rel="stylesheet" href="${codiconStylesheetUri}">
			</head>
      		<body>
				<textarea id="user-input" class="user-input" name="user-input" placeholder="Give a task..."></textarea>
				<button id="submit-button" class="submit-button">Submit</button>
				<br>

				<div id="progress-container">
					<div class="inline-container">
						<div id="progress-loader" class="loader"></div>
						<span id="progress-text" class="subtask-text">Generating subtasks...</span>
						<button id="task-cancel-button" class="codicon codicon-close"></button>
					</div>

					<div id="subtasks-container"></div>

					<div id="buttons-container" class="inline-container">
						<button id="confirm-button">Confirm</button>
						<button id="cancel-button">Cancel</button>
						<button id="regenerate-button">Regenerate</button>
					</div>
				</div>

				<script nonce="${nonce}">
                	var vscode = acquireVsCodeApi();
            	</script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`;
	}
}
