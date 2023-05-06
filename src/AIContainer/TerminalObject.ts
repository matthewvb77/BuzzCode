import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
import { shell } from "../settings/configuration";

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

	readOnly: boolean = false;
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

		this.terminalProcess = cp.spawn(shell, [], {
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
				this.terminalProcess.kill();
				this.readOnly = true;
				this.writeEmitter.fire(
					"\r\n\r\n------------------------Testwise: TASK STOPPED------------------------"
				);
			},
			handleInput: (data: string) => {
				if (this.readOnly) {
					return;
				}

				if (this.terminalProcess === undefined) {
					vscode.window.showErrorMessage("Terminal process is undefined.");
					return "Error";
				}

				if (data === "\r") {
					if (shell === "powershell.exe") {
						for (let i = 0; i < line.length; i++) {
							this.writeEmitter.fire("\x1b[D"); // move cursor left
							this.writeEmitter.fire("\x1b[P"); // Delete character
						}
					} else {
						this.writeEmitter.fire("\r\n");
					}
					this.terminalProcess.stdin?.write(line + "\n");
					line = "";
					return;
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

				this.writeEmitter.fire(data);
			},
		};

		this.terminal = vscode.window.createTerminal({
			name: "Testwise",
			pty: this.terminalPty,
		});

		this.terminal.show();
		this.signal = signal;

		if (
			this.terminalProcess.stdout === null ||
			this.terminalProcess.stderr === null
		) {
			throw new Error("Terminal process stdout or stderr is null.");
		}

		/* ---------------------------------- Event Handlers ---------------------------------- */

		this.terminalProcess.stdout?.on("data", (data) => {
			// Buffer.toString() does not handle control characters like \r. So we replace \n with \n\r
			const dataString: string = data.toString().replace(/\n/g, "\n\r");

			if (this.currentSubtaskIndex !== null) {
				const endOfCommandDelimiter =
					"----------END_OF_COMMAND_SUBTASK_" +
					this.currentSubtaskIndex +
					"----------";

				if (dataString.startsWith(endOfCommandDelimiter)) {
					//TODO: Is this condition enough? Could the delimiter occur anywhere else?
					this.writeEmitter.fire(dataString);

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
					return;
				}
			}
			this.writeEmitter.fire(dataString);
		});

		this.terminalProcess.stderr?.on("data", (data) => {
			// Buffer.toString() does not handle control characters like \r. So we replace \n with \n\r
			const dataString: string = data.toString().replace(/\n/g, "\n\r");

			if (this.currentSubtaskIndex !== null) {
				const endOfCommandDelimiter =
					"----------END_OF_COMMAND_SUBTASK_" +
					this.currentSubtaskIndex +
					"----------";

				if (dataString.startsWith(endOfCommandDelimiter)) {
					//TODO: Is this condition enough? Could the delimiter occur anywhere else?
					this.writeEmitter.fire(dataString);

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
					return;
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
			const endOfCommandDelimiter =
				"----------END_OF_COMMAND_SUBTASK_" + subtaskIndex + "----------";

			if (shell === "bash") {
				this.writeEmitter.fire(`bash$ ${command}\n\r`);
			}
			this.terminalProcess.stdin?.write(`${command}\n`);

			this.terminalProcess.stdin?.write(`echo ${endOfCommandDelimiter}\n`);

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
		this.terminalPty.close();
		this.writeEmitter.dispose();
		this.terminalProcess.kill();
		this.terminal.dispose();
	}
}
