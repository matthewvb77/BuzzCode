// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { generateFunctionFromTests } from "./copilotIntegration/generateFunctionFromTests";
import { getSettingsHtml } from "./settings/getSettingsHtml";
import { SidebarProvider } from "./sidebar/SidebarProvider";

let settingsPanel: vscode.WebviewPanel | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// chatbox panel ----------------------------------------------------------------------------------------------------------------

	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"testwise-sidebar",
			sidebarProvider
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
						vscode.Uri.joinPath(context.extensionUri, "resources"),
						vscode.Uri.joinPath(context.extensionUri, "src", "settings"),
						vscode.Uri.joinPath(context.extensionUri, "src", "sidebar"),
					],
				}
			);

			const tooltipPath = vscode.Uri.joinPath(
				context.extensionUri,
				"resources",
				"tooltip.png"
			);
			const tooltipUri = settingsPanel.webview.asWebviewUri(tooltipPath);

			const settingsScriptPath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"settings",
				"settings.js"
			);
			const settingsScriptUri =
				settingsPanel.webview.asWebviewUri(settingsScriptPath);

			const stylePath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"settings",
				"settings.css"
			);
			const styleUri = settingsPanel.webview.asWebviewUri(stylePath);

			settingsPanel.webview.html = getSettingsHtml(
				apiKey,
				model,
				maxTokens,
				temperature,
				settingsPanel.webview.cspSource,
				tooltipUri,
				settingsScriptUri,
				styleUri
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
