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
			const model = config.get<string>("model");

			if (
				apiKey === undefined ||
				maxTokens === undefined ||
				temperature === undefined ||
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
