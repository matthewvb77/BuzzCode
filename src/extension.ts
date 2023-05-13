import * as vscode from "vscode";
import { getSettingsHtml } from "./settings/getSettingsHtml";
import { SidebarProvider } from "./sidebar/SidebarProvider";

let settingsPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"testwise-sidebar",
			sidebarProvider
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("testwise.settings", () => {
			if (settingsPanel) {
				settingsPanel.reveal();
				return;
			}

			const config = vscode.workspace.getConfiguration("testwise");
			const apiKey = config.get<string>("apiKey");
			const maxTokens = config.get<number>("maxTokens");
			const temperature = config.get<number>("temperature");
			const continuousMode = config.get<boolean>("continuousMode");
			const model = config.get<string>("model");

			if (
				apiKey === undefined ||
				maxTokens === undefined ||
				temperature === undefined ||
				continuousMode === undefined ||
				model === undefined
			) {
				throw new Error(
					"Undefined configuration value[s], this should not happen."
				);
			}

			settingsPanel = vscode.window.createWebviewPanel(
				"testwiseSettings",
				"TestWise Settings",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, "src", "settings"),
						vscode.Uri.joinPath(context.extensionUri, "src", "sidebar"),
						vscode.Uri.joinPath(
							context.extensionUri,
							"node_modules",
							"vscode-codicons",
							"dist"
						),
					],
				}
			);

			const settingsScriptPath = vscode.Uri.joinPath(
				context.extensionUri,
				"src",
				"settings",
				"settings.js"
			);
			const settingsScriptUri =
				settingsPanel.webview.asWebviewUri(settingsScriptPath);

			const styleUri = settingsPanel.webview.asWebviewUri(
				vscode.Uri.joinPath(
					context.extensionUri,
					"src",
					"settings",
					"settings.css"
				)
			);

			const codiconUri = settingsPanel.webview.asWebviewUri(
				vscode.Uri.joinPath(
					context.extensionUri,
					"node_modules",
					"vscode-codicons",
					"dist",
					"codicon.css"
				)
			);

			settingsPanel.webview.html = getSettingsHtml(
				apiKey,
				model,
				maxTokens,
				temperature,
				continuousMode,
				settingsPanel.webview.cspSource,
				settingsScriptUri,
				styleUri,
				codiconUri
			);

			settingsPanel.webview.onDidReceiveMessage(
				async (message) => {
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
										vscode.workspace
											.getConfiguration("testwise")
											.update(
												"continuousMode",
												message.continuousMode,
												vscode.ConfigurationTarget.Global
											),
									]);
									vscode.window.showInformationMessage(
										"TestWise settings saved."
									);
								}
							} catch (error) {
								vscode.window.showErrorMessage(
									"Error saving TestWise settings: " + error
								);
							}
							break;

						case "showWarning":
							vscode.window
								.showWarningMessage(message.text, { modal: true }, "Yes")
								.then((selection) => {
									settingsPanel?.webview.postMessage({
										command: "warningResponse",
										response: selection,
									});
								});
							break;

						default:
							throw new Error(
								"Unknown command received from settings page: " +
									message.command
							);
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
