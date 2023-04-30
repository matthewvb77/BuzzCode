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
	terminalProcess: cp.ChildProcess,
	signal: AbortSignal,
	warn = true
): Promise<CommandResult | "Cancelled"> {
	return new Promise(async (resolve, reject) => {
		signal.onabort = () => {
			signal.onabort = null;
			resolve("Cancelled");
			return;
		};

		const outputChannel = vscode.window.createOutputChannel("Test Runner");
		outputChannel.clear();
		outputChannel.show();

		if (warn) {
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
				resolve({ error, stdout, stderr });
				return;
			} else {
				outputChannel.appendLine(`${line}`);

				// Check if the line contains an error keyword
				const errorKeywords = ["Error", "Failed", "Traceback"];
				if (errorKeywords.some((keyword) => line.includes(keyword))) {
					stderr += line + "\n";
				} else {
					stdout += line + "\n";
				}
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

		terminalProcess.on("close", (code, signal) => {
			resolve({ error, stdout, stderr });
			return;
		});

		const commandSeparator = process.platform === "win32" ? "&&" : ";";
		terminalProcess.stdin.write(
			`${command} ${commandSeparator} echo ${commandEndMarker}\n`
		);
	});
}
