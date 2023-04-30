import * as vscode from "vscode";
import * as cp from "child_process";
import * as readline from "readline";

export type CommandResult = {
	error: cp.ExecException | null;
	stdout: string;
	stderr: string;
};

export async function executeTerminalCommand(
	command: string,
	terminalProcess: cp.ChildProcess
): Promise<CommandResult | "Cancelled"> {
	return new Promise(async (resolve, reject) => {
		const outputChannel = vscode.window.createOutputChannel("Test Runner");
		outputChannel.clear();
		outputChannel.show();
		outputChannel.appendLine("STARTING COMMAND");

		const userResponse = await vscode.window.showWarningMessage(
			`Are you sure you want to run the following command: ${command}?`,
			{ modal: true },
			"Yes",
			"No"
		);

		if (userResponse === "No" || userResponse === undefined) {
			resolve("Cancelled");
			return;
		}

		let stderr = "";
		let stdout = "";
		let error: cp.ExecException | null = null;
		const commandEndMarker = "COMMAND_END_MARKER";

		if (
			terminalProcess.stdout === null ||
			terminalProcess.stderr === null ||
			terminalProcess.stdin === null
		) {
			outputChannel.appendLine(
				`Error: Could not attach listeners to terminal process.`
			);
			reject("Error: Could not attach listeners to terminal process.");
			return;
		}

		const rl = readline.createInterface({
			input: terminalProcess.stdout,
			output: undefined,
			terminal: false,
		});

		rl.on("line", (line) => {
			if (line.trim() === commandEndMarker) {
				outputChannel.appendLine(`Command end marker found.`);
				resolve({ error, stdout, stderr });
				return;
			} else {
				outputChannel.appendLine(`Output: ${line}`);
				stdout += line + "\n";
			}
		});

		terminalProcess.stderr.on("data", (data) => {
			outputChannel.appendLine(`Error output: ${data}`);
			stderr += data.toString();
		});

		terminalProcess.on("error", (err) => {
			outputChannel.appendLine(`Error: ${err.message}`);
			error = err;
		});

		terminalProcess.stdin.write(`${command}; echo ${commandEndMarker}\n`);
	});
}
