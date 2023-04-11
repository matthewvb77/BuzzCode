import * as vscode from "vscode";
import { getNonce } from "../helpers/getNonce";
import { recursiveDevelopment } from "../AIContainer/recursiveDevelopment";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import { queryChatGPT } from "../AIContainer/AIHelpers/queryChatGPT";

export class SidebarProvider implements vscode.WebviewViewProvider {
	_view?: vscode.WebviewView;
	_doc?: vscode.TextDocument;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
				case "submit-task":
					await recursiveDevelopment(message.input);
					break;

				case "submit-question":
					const response = await queryChatGPT(message.input);
					webviewView.webview.postMessage({
						command: "response",
						text: response,
					});
					break;

				default:
					throw new Error("Invalid command");
			}
		});
	}

	public revive(panel: vscode.WebviewView) {
		this._view = panel;
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
			</head>
      		<body>
				<div class="inline-container">
					<label for="input-type">Input:</label>
					<select id="input-type">
						<option value="task">Task</option>
						<option value="question">Question</option>
					</select>
				</div>
				<div class="tabs-wrapper">
					<div id="task-tab" class="tab-container">
						<textarea id="task-user-input" class="user-input" name="task-user-input" placeholder="Give a task..."></textarea>
						<button id="task-submit-button" class="submit-button">Submit</button>
						<br>

						<div id="task-progress" class="task-progress">
							<div id="loader-container" class="inline-container">
								<div class="loader"></div>
								<span id="loader-text">Generating Subtasks...</span>
							</div>
						</div>
					</div>

					<div id="question-tab" class="tab-container">
						<textarea id="question-user-input" class="user-input" name="user-input" placeholder="Ask a question..."></textarea>
						<button id="question-submit-button">Submit</button>
						<br>

						<label id="response-label">Response:</label>
						<textarea id="response-area" name="response-area" placeholder="TestWise will respond..." readonly></textarea>
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
