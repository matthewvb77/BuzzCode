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

	const isWindows = process.platform === "win32";
	const escapedContents = escapeFileContents(contents, isWindows);

	await executeTerminalCommand(
		`echo ${escapedContents} > ${fileName}`,
		terminalProcess,
		false
	);
}

function escapeFileContents(contents: string, isWindows: boolean): string {
	if (isWindows) {
		contents = contents.replace(/\\/g, "\\\\\\").replace(/"/g, '\\"');
	} else {
		contents = contents
			.replace(/\\/g, "\\\\\\\\")
			.replace(/'/g, "\\'")
			.replace(/\$/g, "\\$")
			.replace(/`/g, "\\`");
	}
	contents = contents.replace(/\n/g, "\\n");
	return contents;
}
