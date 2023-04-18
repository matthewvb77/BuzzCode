import * as vscode from "vscode";
import { getNonce } from "../helpers/getNonce";
import { recursiveDevelopment } from "../AIContainer/recursiveDevelopment";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import { queryChatGPT } from "../AIContainer/AIHelpers/queryChatGPT";
import { Subtask } from "../AIContainer/recursiveDevelopment";

export class SidebarProvider implements vscode.WebviewViewProvider {
	_view?: vscode.WebviewView;
	_doc?: vscode.TextDocument;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	/* ------------------ State Persistence Helpers ---------------------  */
	private messageQueue: Array<any> = [];

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				// ratcheting the message queue to add atomicity
				while (this.messageQueue.length > 0) {
					const message = this.messageQueue[0];
					if (this._view) {
						this._view.webview.postMessage(message);
					}

					// wait for response before removing from queue
					this.messageQueue.shift();
				}
			}
		});

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		let taskInProgress = false;
		var abortController: AbortController | undefined;
		var signal: AbortSignal | undefined;

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (!message.input && message.command !== "cancel-task") {
				return;
			}
			if (!hasValidAPIKey() && message.command !== "cancel-task") {
				vscode.window.showErrorMessage(
					"Please enter a valid API key in the TestWise settings."
				);
				return;
			}

			switch (message.command) {
				case "response":
					break;

				case "submit":
					if (taskInProgress) {
						vscode.window.showInformationMessage(
							"A task is already in progress."
						);
						return;
					}
					taskInProgress = true;
					abortController = new AbortController();
					signal = abortController.signal;
					this.showTaskStarted();

					try {
						const result = await recursiveDevelopment(
							message.input,
							signal,
							this.onStartSubtask.bind(this),
							this.onSubtasksReady.bind(this),
							this.onSubtaskError.bind(this)
						);
						if (result === "Cancelled") {
							this.showTaskCancelled();
						} else if (typeof result === "string") {
							this.showTaskError();
						} else {
							this.showTaskCompleted();
						}
						taskInProgress = false;
					} catch (error) {
						vscode.window.showErrorMessage(
							"Error occurred while running task: " + error
						);
						taskInProgress = false;
					}
					break;

				case "cancel-task":
					if (!taskInProgress) {
						vscode.window.showInformationMessage(
							"No task is currently in progress."
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
			this.postMessageToWebview({
				command: "onStartSubtask",
				subtask: subtask,
			});
		}
	}

	private postMessageToWebview(message: any) {
		if (this._view && this._view.visible) {
			this._view.webview.postMessage(message);
		} else {
			this.messageQueue.push(message);
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
				this.postMessageToWebview({
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

	private showTaskStarted() {
		if (this._view) {
			this.postMessageToWebview({
				command: "showTaskStarted",
			});
		}
	}

	private showTaskCompleted() {
		if (this._view) {
			this.postMessageToWebview({
				command: "showTaskCompleted",
			});
		}
	}

	private showTaskCancelled() {
		if (this._view) {
			this.postMessageToWebview({
				command: "showTaskCancelled",
			});
		}
	}

	private showTaskError() {
		if (this._view) {
			this.postMessageToWebview({
				command: "showTaskError",
			});
		}
	}

	private onSubtaskError() {
		if (this._view) {
			this.postMessageToWebview({
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
				<Span>Input:</Span>
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
