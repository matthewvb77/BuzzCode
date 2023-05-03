import * as vscode from "vscode";
import * as cp from "child_process";

export type CommandResult = {
	error: string;
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

		const endOfCommandDelimiter = "END_OF_COMMAND";
		let output = "";

		terminalProcess.stdout?.on("data", (data) => {
			output += data;
			if (output.includes(endOfCommandDelimiter)) {
				terminal.dispose();
				resolve({
					error: "",
					stdout: output.replace(endOfCommandDelimiter, ""),
					stderr: "",
				});
			}
		});

		terminalProcess.stdin?.write(`${command}\r`);
		terminalProcess.stdin?.write(`echo ${endOfCommandDelimiter}\r`);

		const writeEmitter = new vscode.EventEmitter<string>();

		const vscodePty: vscode.Pseudoterminal = {
			onDidWrite: writeEmitter.event,
			open: () => {
				writeEmitter.fire("Terminal Opened");
			},
			close: () => {
				terminalProcess.kill();
				signal.onabort = null;
				resolve("Cancelled");
				return;
			},
			handleInput: (data: string) => {
				terminalProcess.stdin?.write(data);
			},
		};

		const terminal = vscode.window.createTerminal({
			name: "Testwise",
			pty: vscodePty,
		});

		terminal.show();
	});
}
