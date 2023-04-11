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
			switch (message.command) {
				case "submit":
					if (hasValidAPIKey()) {
						if (message.inputType === "task") {
							await recursiveDevelopment(message.input);
						} else if (message.inputType === "question") {
							const response = await queryChatGPT(message.input);
							webviewView.webview.postMessage({
								command: "response",
								text: response,
							});
						} else {
							throw new Error("Invalid input type");
						}
					} else {
						vscode.window.showErrorMessage(
							"Please enter a valid API key in the TestWise settings."
						);
					}
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
				<textarea id="user-input" name="user-input" placeholder=""></textarea>
				<button id="submit-button">Submit</button>
				<br>

				<div class="bottom-container">
					<div id="task-progress" class="task-progress">
						<div class="inline-container">
							<div class="loader"></div>
							<span id="loader-text">Loading SubTasks...</span>
						</div>
					</div>
					<label id="response-label">Response:</label>
					<textarea id="response-area" name="response-area" placeholder="Jaydee will respond..." readonly></textarea>
				</>

				<script nonce="${nonce}">
                	var vscode = acquireVsCodeApi();
            	</script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`;
	}
}
