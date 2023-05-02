import * as vscode from "vscode";
import * as pty from "node-pty";

export type CommandResult = {
	error: string;
	stdout: string;
	stderr: string;
};

export async function executeTerminalCommand(
	command: string,
	terminalProcess: pty.IPty,
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

		terminalProcess.onData((data) => {
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

		terminalProcess.write(`${command}\r`);
		terminalProcess.write(`echo ${endOfCommandDelimiter}\r`);

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
				terminalProcess.write(data);
			},
		};

		const terminal = vscode.window.createTerminal({
			name: "Testwise",
			pty: vscodePty,
		});

		terminal.show();
	});
}
