// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as crypto from "crypto";
import { generateFunctionFromTests } from "./copilotIntegration/generateFunctionFromTests";
import { getSettingsHtml } from "./settings/getSettingsHtml";
import { SidebarDataProvider } from "./sidebarDataProvider";

let settingsPanel: vscode.WebviewPanel | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "testwise" is now active!'); // TODO: remove (debugging)

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(
		"testwise.helloWorld",
		() => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage(
				"Hello World from TestWise! -- TESTING"
			);
		}
	);

	context.subscriptions.push(disposable);

	const sidebarDataProvider = new SidebarDataProvider();
	const sidebar = vscode.window.createTreeView("testwise-sidebar", {
		treeDataProvider: sidebarDataProvider,
	});
	context.subscriptions.push(sidebar);

	// chatbox panel ----------------------------------------------------------------------------------------------------------------

	class TestWiseChatboxProvider implements vscode.WebviewViewProvider {
		private _view?: vscode.WebviewView;
		private _context: vscode.ExtensionContext;

		constructor(
			private readonly _extensionUri: vscode.Uri,
			context: vscode.ExtensionContext
		) {
			this._context = context;
		}

		public resolveWebviewView(
			webviewView: vscode.WebviewView,
			context: vscode.WebviewViewResolveContext,
			_token: vscode.CancellationToken
		) {
			this._view = webviewView;

			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "src")],
			};

			// Set the HTML for the chatbox here
			webviewView.webview.html = `
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

			webviewView.webview.onDidReceiveMessage(
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

	const chatboxProvider = new TestWiseChatboxProvider(
		context.extensionUri,
		context
	);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"testwise-chatbox",
			chatboxProvider
		)
	);

	// chatbox panel end -------------------------------------------------------------------------------------------------------------

	// function that pushes a new command where you can query openai api
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"testwise.codeForMe",
			async (prompt: string) => {
				// Get user's active vscode window
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showErrorMessage("No active text editor found.");
					return;
				}

				// Get function from test suite
				const testSuites = editor.document.getText();
				const generatedFunction = await generateFunctionFromTests(testSuites);

				if (!generatedFunction) {
					vscode.window.showErrorMessage(
						"Failed to generate a function from the test suites."
					);
					return;
				}

				// TODO: spits the function into the cursor, do this differently for ux
				editor.edit((editBuilder) => {
					const position = editor.selection.active;
					editBuilder.insert(position, generatedFunction);
				});
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("testwise.settings", () => {
			if (settingsPanel) {
				settingsPanel.reveal();
				return;
			}

			const config = vscode.workspace.getConfiguration("testwise");
			const apiKey = config.get<string>("apiKey") || "";
			const maxTokens = config.get<number>("maxTokens") || 100;
			const temperature = config.get<number>("temperature") || 0.2;
			const model = config.get<string>("model") || "gpt-3.5-turbo";

			settingsPanel = vscode.window.createWebviewPanel(
				"testwiseSettings",
				"TestWise Settings",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, "src", "resources"),
						vscode.Uri.joinPath(context.extensionUri, "src", "settings"),
					],
				}
			);

			const tooltipPath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"resources",
				"tooltip.png"
			);
			const tooltipUri = settingsPanel.webview.asWebviewUri(tooltipPath);

			const scriptPath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"settings",
				"scripts.js"
			);
			const scriptUri = settingsPanel.webview.asWebviewUri(scriptPath);

			const stylePath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"settings",
				"styles.css"
			);
			const styleUri = settingsPanel.webview.asWebviewUri(stylePath);

			function generateNonce(): string {
				const nonceBuffer = new Uint8Array(16);
				crypto.randomFillSync(nonceBuffer);
				return Buffer.from(nonceBuffer.buffer).toString("base64");
			}
			const nonce = generateNonce();

			settingsPanel.webview.html = getSettingsHtml(
				apiKey,
				model,
				maxTokens,
				temperature,
				settingsPanel.webview.cspSource,
				tooltipUri,
				scriptUri,
				styleUri,
				nonce
			);

			settingsPanel.webview.onDidReceiveMessage(
				async (message) => {
					console.log("Received message from webview:", message);
					switch (message.command) {
						case "saveSettings":
							try {
								if (message.error === "invalidApiKey") {
									vscode.window.showErrorMessage(
										"Invalid API key, please try again."
									);
								} else {
									await Promise.all([
										vscode.workspace
											.getConfiguration("testwise")
											.update(
												"apiKey",
												message.apiKey,
												vscode.ConfigurationTarget.Global
											),
										vscode.workspace
											.getConfiguration("testwise")
											.update(
												"model",
												message.model,
												vscode.ConfigurationTarget.Global
											),
										vscode.workspace
											.getConfiguration("testwise")
											.update(
												"maxTokens",
												message.maxTokens,
												vscode.ConfigurationTarget.Global
											),
										vscode.workspace
											.getConfiguration("testwise")
											.update(
												"temperature",
												message.temperature,
												vscode.ConfigurationTarget.Global
											),
									]);
									vscode.window.showInformationMessage(
										"TestWise settings saved."
									);
								}
							} catch (error) {
								vscode.window.showErrorMessage(
									"Error saving TestWise settings."
								);
								console.error("Error updating settings:", error);
							}
							break;
					}
				},
				undefined,
				context.subscriptions
			);

			settingsPanel.onDidDispose(
				() => {
					settingsPanel = undefined;
				},
				null,
				context.subscriptions
			);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
