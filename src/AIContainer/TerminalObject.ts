import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
import { shell, shellArgs } from "../settings/configuration";

export type CommandResult = {
	error: string;
	stdout: string;
	stderr: string;
};

export class TerminalObject {
	terminalProcess: cp.ChildProcess;
	terminalPty: vscode.Pseudoterminal;
	terminal: vscode.Terminal;
	writeEmitter: vscode.EventEmitter<string>;
	signal: AbortSignal;

	currentSubtaskIndex: number | null = null;

	promiseHandlers: Map<
		number,
		[(result: CommandResult | "Cancelled") => void, (reason?: any) => void]
	> = new Map();

	constructor(signal: AbortSignal) {
		/* ---------------------------------- Constructing ---------------------------------- */
		const workingDirectory = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if (!workingDirectory) {
			vscode.window.showErrorMessage("No workspace folder open.");
			throw new Error("No workspace folder open.");
		}

		this.terminalProcess = cp.spawn(shell, shellArgs, {
			cwd: workingDirectory,
			env: process.env,
		});

		this.writeEmitter = new vscode.EventEmitter<string>();
		let line = "";
		this.terminalPty = {
			onDidWrite: this.writeEmitter.event,
			open: () => {
				this.writeEmitter.fire(
					"------------------------Testwise: TASK STARTED------------------------\r\n\r\n"
				);
			},
			close: () => {
				this.writeEmitter.fire("Testwise: TASK STOPPED\n");
				this.dispose();
			},
			handleInput: (data: string) => {
				if (this.terminalProcess === undefined) {
					vscode.window.showErrorMessage("Terminal process is undefined.");
					return "Error";
				}

				if (data === "\r") {
					line = "";
				} else if (data === "\x7f") {
					if (line.length === 0) {
						return;
					}
					line = line.slice(0, -1);
					this.writeEmitter.fire("\x1b[D"); // move cursor left
					this.writeEmitter.fire("\x1b[P"); // Delete character
				} else {
					line += data;
				}

				this.terminalProcess.stdin?.write(data);
			},
		};

		this.terminal = vscode.window.createTerminal({
			name: "Testwise",
			pty: this.terminalPty,
		});

		this.terminal.show();
		this.signal = signal;

		/* ---------------------------------- Event Handlers ---------------------------------- */
		this.terminalProcess.stdout?.on("data", (data) => {
			const dataString = data.toString(); // TODO: This doesn't work for control characters

			if (this.currentSubtaskIndex !== null) {
				const endOfCommandDelimiter =
					"END_OF_COMMAND_SUBTASK_" + this.currentSubtaskIndex;

				if (dataString.includes(endOfCommandDelimiter)) {
					const result = {
						error: "",
						stdout: dataString,
						stderr: "",
					};

					const [resolve] =
						this.promiseHandlers.get(this.currentSubtaskIndex) || [];
					if (resolve) {
						resolve(result);
						this.promiseHandlers.delete(this.currentSubtaskIndex);
					}

					this.currentSubtaskIndex = null;
				}
			}

			this.writeEmitter.fire(dataString);
		});

		this.terminalProcess.stderr?.on("data", (data) => {
			const dataString = data.toString();

			if (this.currentSubtaskIndex !== null) {
				const endOfCommandDelimiter =
					"END_OF_COMMAND_SUBTASK_" + this.currentSubtaskIndex;

				if (dataString.includes(endOfCommandDelimiter)) {
					const result = {
						error: "",
						stdout: dataString,
						stderr: "",
					};

					const [resolve] =
						this.promiseHandlers.get(this.currentSubtaskIndex) || [];
					if (resolve) {
						resolve(result);
						this.promiseHandlers.delete(this.currentSubtaskIndex);
					}

					this.currentSubtaskIndex = null;
				}
			}

			this.writeEmitter.fire(dataString);
		});

		this.terminalProcess.on("error", (error) => {
			this.writeEmitter.fire(error.message + "\n");

			if (this.currentSubtaskIndex) {
				const [, reject] =
					this.promiseHandlers.get(this.currentSubtaskIndex) || [];
				if (reject) {
					reject(error);
					this.promiseHandlers.delete(this.currentSubtaskIndex);
				}
			}
		});
	}

	async executeCommand(
		command: string,
		subtaskIndex: number,
		warn = true
	): Promise<CommandResult | "Cancelled"> {
		return new Promise(async (resolve, reject) => {
			this.signal.onabort = () => {
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
			this.currentSubtaskIndex = subtaskIndex;
			const endOfCommandDelimiter = "END_OF_COMMAND_SUBTASK_" + subtaskIndex;

			this.terminalProcess.stdin?.write(`${command}\r`);
			this.terminalProcess.stdin?.write(`echo ${endOfCommandDelimiter}\r`);

			this.promiseHandlers.set(subtaskIndex, [resolve, reject]);
		});
	}

	async generateFile(
		fileName: string,
		contents: string,
		subtaskIndex: number
	): Promise<CommandResult | "Cancelled"> {
		return new Promise(async (resolve, reject) => {
			this.signal.onabort = () => {
				resolve("Cancelled");
				return;
			};

			const overwrite = await vscode.window.showWarningMessage(
				`If '${fileName}' already exists, this action will overwrite it. Do you want to proceed?`,
				{ modal: true },
				"Yes"
			);
			if (overwrite !== "Yes") {
				resolve("Cancelled");
				return;
			}

			// Create a temporary file with the contents
			const tempFile = tmp.fileSync();
			fs.writeFileSync(tempFile.name, contents);

			// Copy the temporary file to the destination file using the terminal
			const copyCommand = process.platform === "win32" ? "copy" : "cp";

			const result = await this.executeCommand(
				`${copyCommand} ${tempFile.name} ${fileName}`,
				subtaskIndex,
				false
			);

			// Clean up the temporary file
			tempFile.removeCallback();

			resolve(result);
			return;
		});
	}

	dispose() {
		this.terminalProcess.kill();
		this.terminal.dispose();
		this.writeEmitter.dispose();
		this.terminalPty.close();
	}
}
