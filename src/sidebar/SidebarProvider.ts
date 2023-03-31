import * as vscode from "vscode";
import { getNonce } from "../getNonce";
import { iterativeGeneration } from "../iterativeGeneration/iterativeGeneration";

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

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case "onInfo": {
					if (!data.value) {
						return;
					}
					vscode.window.showInformationMessage(data.value);
					break;
				}
				case "onError": {
					if (!data.value) {
						return;
					}
					vscode.window.showErrorMessage(data.value);
					break;
				}
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
						<option value="description">Function Description</option>
						<option value="test">Existing Function</option>
					</select>
				</div>
				<textarea id="user-input" name="user-input" rows="4" placeholder=""></textarea>
				<button id="submit-button">Submit</button>
				<br>
				<label id="response-label">Response:</label>
				<textarea id="response-area" name="response-area" rows="4" placeholder="Model will respond..." readonly></textarea>
		  		
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`;
	}
}
