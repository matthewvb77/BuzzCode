import * as vscode from "vscode";

export class ChatboxViewProvider {
	private _view?: vscode.Webview;
	private _context: vscode.ExtensionContext;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		context: vscode.ExtensionContext,
		private webview?: vscode.Webview
	) {
		this._context = context;
	}

	public resolveWebviewView(webview: vscode.Webview) {
		this._view = webview;

		webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "src")],
		};

		// Set the HTML for the chatbox here
		webview.html = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body>
                <div>
                  <input type="text" id="chatbox" placeholder="Enter a prompt to generate code...">
                  <button id="submit">Submit</button>
                </div>
                <script>
                  document.getElementById('submit').addEventListener('click', () => {
                    const prompt = document.getElementById('chatbox').value;
                    vscode.postMessage({ command: 'submitPrompt', prompt });
                  });
                </script>
              </body>
            </html>
        `;

		webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "submitPrompt":
						const prompt = message.prompt;
						if (prompt) {
							vscode.commands.executeCommand("testwise.codeForMe", prompt);
						}
						break;
				}
			},
			undefined,
			this._context.subscriptions
		);
	}
}
