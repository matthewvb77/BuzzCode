import * as vscode from "vscode";
import { getNonce } from "../helpers/getNonce";
import { recursiveDevelopment } from "../agent/recursiveDevelopment";
import { hasValidOpenaiApiKey } from "../helpers/hasValidOpenaiApiKey";
import { Subtask, SubtaskState } from "../agent/subtask";
import { ERROR_PREFIX, RETURN_CANCELLED } from "../settings/configuration";

// Commands
const SUBMIT = "submit";
const CANCEL_TASK = "cancel-task";

enum TaskState {}

export class SidebarProvider implements vscode.WebviewViewProvider {
	_view?: vscode.WebviewView;
	_doc?: vscode.TextDocument;
	_state: any = {
		userInput: String,
		taskInProgress: Boolean,
		taskState: String,
		subtasks: Array<Subtask>,
		previousSubtaskCount: Number,
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

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this._rebuildWebview();
			}
		});

		this._state.taskInProgress = false;
		var abortController: AbortController | undefined;
		var signal: AbortSignal | undefined;

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.command === "userAction") {
				// ignore, another event listener handles this
				return;
			}
			if (!message.input && message.command !== "cancel-task") {
				vscode.window.showInformationMessage("No task entered");
				return;
			}
			if (!hasValidOpenaiApiKey()) {
				vscode.window.showErrorMessage(
					"Please enter a valid API key in the BuzzCode settings."
				);
				return;
			}

			switch (message.command) {
				case SUBMIT:
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
					this._state.previousSubtaskCount = 0;
					this.updateTaskState(SubtaskState.started);

					try {
						const result = await recursiveDevelopment(
							message.input,
							signal,
							this.onStartSubtask.bind(this),
							this.onSubtasksReady.bind(this),
							this.onSubtaskError.bind(this)
						);
						if (result === RETURN_CANCELLED) {
							this.updateTaskState(SubtaskState.cancelled);
						} else if (result && result.startsWith("Error")) {
							this.updateTaskState(SubtaskState.error);
							if (result === "Error: Axios code 429 - Rate limit exceeded") {
								vscode.window.showInformationMessage(
									"OpenAI API rate limit exceeded. Please wait a few secondes and try again.\n" +
										"NOTE: OpenAI free tier is limited to 3 RPM (requests per minute)."
								);
							}
							vscode.window.showErrorMessage(result);
						} else {
							this.updateTaskState(SubtaskState.completed);
						}
						this._state.taskInProgress = false;
					} catch (error) {
						vscode.window.showErrorMessage(
							`Error occurred while running task: ${(error as Error).message}`
						);
						this.updateTaskState(SubtaskState.error);
						this._state.taskInProgress = false;
					}
					break;

				case CANCEL_TASK:
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

				default:
					throw Error(`Invalid command: ${message.command}`);
			}
		});
	}

	public revive(panel: vscode.WebviewView) {
		this._view = panel;
	}

	private onStartSubtask(subtask: Subtask) {
		if (
			subtask.index > 0 &&
			this._state.subtasks[subtask.index - 1].state === SubtaskState.active
		) {
			this._state.subtasks[subtask.index - 1].state = SubtaskState.completed;
		}
		this._state.subtasks[subtask.index].state = SubtaskState.active;
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
				resolve(RETURN_CANCELLED);
				return;
			};
			signal.onabort = onAbort;

			this.updateTaskState(SubtaskState.waiting);

			// If subtasks were made by recurse, set recurse subtask to waiting
			if (this._state.subtasks) {
				if (
					this._state.subtasks.length > 0 &&
					this._state.subtasks[this._state.subtasks.length - 1].state ===
						"active"
				) {
					this._state.subtasks[this._state.subtasks.length - 1].state =
						"waiting";
				}
			}
			// update subtask indices
			subtasks.forEach((subtask) => {
				subtask.index += this._state.previousSubtaskCount;
			});
			// update subtasks state
			this._state.subtasks.push(...subtasks);

			if (this._view) {
				// show the new subtasks
				this._view.webview.postMessage({
					command: "showSubtasks",
					subtasks: subtasks,
				});

				this._view.webview.onDidReceiveMessage((message) => {
					if (message.command === "userAction") {
						switch (message.action) {
							case "confirm":
								this.updateTaskState(SubtaskState.active);
								// update state for recursion subtask
								if (this._state.previousSubtaskCount !== 0) {
									this._state.subtasks[
										this._state.previousSubtaskCount - 1
									].state = "completed";
								}

								this._state.previousSubtaskCount = this._state.subtasks.length;
								break;

							case "cancel":
								this.updateTaskState(SubtaskState.cancelled);
								// update state for recursion subtask
								if (this._state.previousSubtaskCount !== 0) {
									this._state.subtasks[
										this._state.previousSubtaskCount - 1
									].state = "cancelled";
								}
								break;

							case "regenerate":
								this.updateTaskState(SubtaskState.active);
								// update state for recursion subtask
								if (this._state.previousSubtaskCount !== 0) {
									this._state.subtasks[
										this._state.previousSubtaskCount - 1
									].state = "active";
								}

								this._state.subtasks = this._state.subtasks.slice(
									0,
									this._state.previousSubtaskCount
								);
								break;

							default:
								throw Error("Invalid action: " + message.action);
						}

						resolve(message.action);
						return;
					}
				});
			}
		});
	}

	/*
		Acceptable states: completed, cancelled, error, waiting, active, started
	*/
	private updateTaskState(state: SubtaskState) {
		this._state.taskState = state;

		if (state === "completed" || state === "cancelled" || state === "error") {
			this._state.subtasks = this._state.subtasks.map((subtask: Subtask) => {
				if (subtask.state === "active") {
					subtask.state = state;
				}

				return subtask;
			});
		}

		if (this._view) {
			this._view.webview.postMessage({
				command: "updateTaskState",
				taskState: state,
			});
		}
	}

	private onSubtaskError(subtaskIndex: number) {
		this._state.subtasks[subtaskIndex].state = "cancelled";

		for (let i = subtaskIndex + 1; i < this._state.subtasks.length; i++) {
			this._state.subtasks[i].state = "blocked";
		}

		if (this._view) {
			this._view.webview.postMessage({
				command: "onSubtaskError",
				index: subtaskIndex,
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
