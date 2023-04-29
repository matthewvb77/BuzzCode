import * as vscode from "vscode";
import { executeTerminalCommand } from "./executeTerminalCommand";

export async function generateFile(
	fileName: string | null,
	contents: string | null
) {
	/* ------------------------------- Validate Input --------------------------------- */
	if (!contents || !fileName) {
		vscode.window.showErrorMessage("No contents or fileName provided.");
		return;
	}

	const overwrite = await vscode.window.showWarningMessage(
		`This action will overwrite '${fileName}' if it already exists. Do you want to proceed?`,
		{ modal: true },
		"Yes"
	);

	if (overwrite !== "Yes") {
		// User chose not to proceed
		return "Cancelled";
	}

	// Escape double quotes in the file contents
	const escapedContents = contents.replace(/"/g, '\\"');

	// Send a command to create the file at the terminal's current working directory
	if (process.platform === "win32") {
		// For Windows command prompt
		executeTerminalCommand(`echo "${escapedContents}" > "${fileName}"`, false);
	} else {
		// For Unix-like shells
		executeTerminalCommand(`echo "${escapedContents}" > "${fileName}"`, false);
	}
}
