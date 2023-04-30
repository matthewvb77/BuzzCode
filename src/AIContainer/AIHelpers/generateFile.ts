import * as vscode from "vscode";
import { executeTerminalCommand } from "./executeTerminalCommand";
import * as cp from "child_process";

export async function generateFile(
	fileName: string | null,
	contents: string | null,
	terminalProcess: cp.ChildProcess
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

	const escapedContents = escapeFileContents(contents);

	// Send a command to create the file at the terminal's current working directory
	if (process.platform === "win32") {
		// For Windows command prompt
		await executeTerminalCommand(
			`echo "${escapedContents}" > "${fileName}"`,
			terminalProcess
		);
	} else {
		// For Unix-like shells
		await executeTerminalCommand(
			`echo '${escapedContents}' > '${fileName}'`,
			terminalProcess,
			false
		);
	}
}

function escapeFileContents(contents: string): string {
	return contents
		.replace(/\\/g, "\\\\") // Escape backslashes
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\$/g, "\\$") // Escape dollar signs
		.replace(/`/g, "\\`") // Escape backticks
		.replace(/\n/g, "\\n"); // Escape newlines
}
