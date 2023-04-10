import * as vscode from "vscode";
import * as cp from "child_process";

export type CommandResult = {
	error: cp.ExecException | null;
	stdout: string;
	stderr: string;
};

export function executeTerminalCommand(
	command: string
): Promise<
	| { error: cp.ExecException | null; stdout: string; stderr: string }
	| "Cancelled by user."
> {
	return new Promise(async (resolve, reject) => {
		const outputChannel = vscode.window.createOutputChannel("Test Runner");
		outputChannel.clear();
		outputChannel.show();

		outputChannel.appendLine(`Running: ${command}`);

		const userResponse = await vscode.window.showWarningMessage(
			`Are you sure you want to run the following command: ${command}?`,
			{ modal: true },
			"Yes",
			"No"
		);

		if (userResponse === "No" || userResponse === undefined) {
			reject("Cancelled by user.");
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!workspaceFolder) {
			reject(new Error("No workspace folder found."));
		}

		const execOptions = {
			cwd: workspaceFolder,
		};

		const exec = cp.exec(command, execOptions, (error, stdout, stderr) => {
			if (error) {
				outputChannel.appendLine(`Error: ${error.message}`);
			}
			if (stderr) {
				outputChannel.appendLine(`Error output: ${stderr}`);
			}
			if (stdout) {
				outputChannel.appendLine(`Output: ${stdout}`);
			}
			resolve({ error, stdout, stderr });
		});
	});
}
