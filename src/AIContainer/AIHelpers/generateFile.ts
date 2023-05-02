import * as vscode from "vscode";
import { executeTerminalCommand } from "./executeTerminalCommand";
import * as fs from "fs";
import * as tmp from "tmp";
import { CommandResult } from "./executeTerminalCommand";
import * as pty from "node-pty";

export async function generateFile(
	fileName: string | null,
	contents: string | null,
	terminalProcess: pty.IPty,
	signal: AbortSignal
): Promise<CommandResult | "Cancelled"> {
	return new Promise(async (resolve, reject) => {
		signal.onabort = () => {
			signal.onabort = null;
			resolve("Cancelled");
			return;
		};
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

		// Create a temporary file with the contents
		const tempFile = tmp.fileSync();
		fs.writeFileSync(tempFile.name, contents);

		// Copy the temporary file to the destination file using the terminal
		const copyCommand = process.platform === "win32" ? "copy" : "cp";

		const result = await executeTerminalCommand(
			`${copyCommand} ${tempFile.name} ${fileName}`,
			terminalProcess,
			signal,
			false
		);

		// Clean up the temporary file
		tempFile.removeCallback();

		resolve(result);
	});
}
