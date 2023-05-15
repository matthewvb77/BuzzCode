import * as vscode from "vscode";

export function hasValidOpenaiApiKey() {
	const openaiApiKey = vscode.workspace
		.getConfiguration("testwise")
		.get("openaiApiKey");
	return (
		openaiApiKey !== undefined &&
		openaiApiKey !== null &&
		openaiApiKey.toString().trim() !== ""
	);
}
