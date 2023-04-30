import * as vscode from "vscode";
import * as cp from "child_process";
import * as readline from "readline";
import { platform } from "os";

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
		const commandErrorMarker = "COMMAND_ERROR_MARKER";

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
			} else if (line.trim() === commandErrorMarker) {
				resolve({ error: error, stdout, stderr });
				return;
			} else {
				outputChannel.appendLine(`${line}`);
				stdout += line.toString();
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

		if (platform() === "win32") {
			terminalProcess.stdin.write(
				`((${command}) && echo ${commandEndMarker}) || echo ${commandErrorMarker}\n`
			);
		} else {
			terminalProcess.stdin.write(
				`{ ${command}; echo ${commandEndMarker}; } || echo ${commandErrorMarker}\n`
			);
		}
	});
}
