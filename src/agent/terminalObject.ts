import vscode from "vscode";
import cp from "child_process";
import fs from "fs";
import tmp from "tmp";
import merge2 from "merge2";
import { shell, shellArgs, delay } from "../settings/configuration";
import { RETURN_CANCELLED } from "../settings/configuration";

export type CommandResult = {
	error: string;
	stdout: string;
	stderr: string;
};

export class TerminalObject {
	terminalProcess: cp.ChildProcess;
	terminalPty!: vscode.Pseudoterminal;
	terminal!: vscode.Terminal;
	writeEmitter!: vscode.EventEmitter<string>;
	signal: AbortSignal;

	outputStream: merge2.Merge2Stream | null = null;
	readOnly: boolean = false;
	currentSubtaskIndex: number | null = null;
	currentCommandResult: string = "";

	promiseHandlers: Map<
		number,
		[(result: CommandResult | "Cancelled") => void, (reason?: any) => void]
	> = new Map();

	constructor(
		terminalProcess: cp.ChildProcess,
		terminalPty: vscode.Pseudoterminal,
		terminal: vscode.Terminal,
		writeEmitter: vscode.EventEmitter<string>,
		signal: AbortSignal,
		readOnly: boolean
	) {
		this.terminalProcess = terminalProcess;
		this.terminalPty = terminalPty;
		this.terminal = terminal;
		this.writeEmitter = writeEmitter;
		this.signal = signal;
		this.readOnly = readOnly;

		if (
			this.terminalProcess.stdout === null ||
			this.terminalProcess.stderr === null
		) {
			throw new Error("Terminal process stdout or stderr is null.");
		}

		this.outputStream = merge2([
			this.terminalProcess.stdout,
			this.terminalProcess.stderr,
		]);

		/* ---------------------------------- Event Handlers ---------------------------------- */

		this.outputStream.on("data", (data) => {
			// Buffer.toString() does not handle control characters like \r. So we replace \n with \n\r
			const dataString: string = data.toString().replace(/\n/g, "\n\r");

			if (this.currentSubtaskIndex !== null) {
				this.currentCommandResult += dataString;

				const endOfCommandDelimiter =
					"SUBTASK_" + this.currentSubtaskIndex + "_END";

				// match "endOfCommandDelimiter", but not "echo endOfCommandDelimiter"
				const delimiterRegex = new RegExp(
					`(?<!echo\\s)${endOfCommandDelimiter}`,
					"g"
				);
				if (delimiterRegex.test(dataString)) {
					if (shell === "bash") {
						this.writeEmitter.fire(dataString.split(endOfCommandDelimiter)[0]);
					} else {
						this.writeEmitter.fire(dataString);
					}

					const result = {
						error: "",
						stdout: this.currentCommandResult.replace(
							endOfCommandDelimiter,
							""
						),
						stderr: "",
					};

					this.currentCommandResult = "";

					const [resolve] =
						this.promiseHandlers.get(this.currentSubtaskIndex) || [];
					if (resolve) {
						resolve(result);
						this.promiseHandlers.delete(this.currentSubtaskIndex);
					}

					this.currentSubtaskIndex = null;
					return;
				}

				// check output for error
				if (containsError(dataString)) {
					const result = {
						error: parseErrorMessage(dataString),
						stdout: "",
						stderr: "",
					};

					const [resolve] =
						this.promiseHandlers.get(this.currentSubtaskIndex) || [];
					if (resolve) {
						resolve(result);
						this.promiseHandlers.delete(this.currentSubtaskIndex);
					}
				}
			}

			this.writeEmitter.fire(dataString);
		});

		this.terminalProcess.on("error", (error) => {
			this.writeEmitter.fire(error.message + "\n");

			if (this.currentSubtaskIndex) {
				const [resolve] =
					this.promiseHandlers.get(this.currentSubtaskIndex) || [];
				if (resolve) {
					const result = {
						error: error.message,
						stdout: "",
						stderr: "",
					};
					resolve(result);
					this.promiseHandlers.delete(this.currentSubtaskIndex);
				}
			}
		});
	}

	/*
		Since the PseudoTerminal creation is asynchronous, this factory method is necessary
	 */
	static async create(signal: AbortSignal): Promise<TerminalObject> {
		var terminalProcess: cp.ChildProcess | undefined;
		var terminalPty: vscode.Pseudoterminal | undefined;
		var terminal: vscode.Terminal | undefined;
		var writeEmitter: vscode.EventEmitter<string> | undefined;
		var readOnly: boolean = false;

		/* -----------------------ASYNC CREATION ----------------------*/
		const workingDirectory = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if (!workingDirectory) {
			throw new Error("No workspace folder open.");
		}

		terminalProcess = cp.spawn(shell, shellArgs, {
			cwd: workingDirectory,
			env: process.env,
		});

		var terminalReady = new Promise<void>((resolve) => {
			writeEmitter = new vscode.EventEmitter<string>();
			let line = "";
			let cursorPos = 0;
			terminalPty = {
				onDidWrite: writeEmitter.event,
				open: () => {
					writeEmitter?.fire(
						"------------------------BuzzCode: TASK STARTED------------------------\r\n\r\n"
					);
					resolve();
				},
				close: () => {
					terminalProcess?.kill();
					readOnly = true;
					writeEmitter?.fire(
						"\r\n\r\n------------------------BuzzCode: TASK STOPPED------------------------"
					);
				},
				handleInput: (data: string) => {
					if (readOnly) {
						return;
					}

					if (!terminalProcess) {
						throw Error("Terminal process is undefined.");
					}

					const charCode = data.charCodeAt(0);

					if (data === "\r") {
						if (shell === "powershell.exe") {
							for (let i = 0; i < line.length; i++) {
								writeEmitter?.fire("\x1b[D"); // move cursor left
								writeEmitter?.fire("\x1b[P"); // Delete character
							}
						} else {
							writeEmitter?.fire("\r\n");
						}
						terminalProcess.stdin?.write(line + "\n");
						line = "";
						cursorPos = 0;
						return;
					} else if (data === "\x7f") {
						if (cursorPos > 0) {
							line = line.slice(0, cursorPos - 1) + line.slice(cursorPos);
							cursorPos--;
							writeEmitter?.fire("\x1b[D"); // move cursor left
							writeEmitter?.fire("\x1b[P"); // Delete character
						}
					} else if (data === "\x1b[A" || data === "\x1b[B") {
						// ignore up and down arrow keys
						return;
					} else if (data === "\x1b[D") {
						// Handle left arrow key
						if (cursorPos > 0) {
							cursorPos--;
							writeEmitter?.fire("\x1b[D"); // move cursor left
						}
					} else if (data === "\x1b[C") {
						// Handle right arrow key
						if (cursorPos < line.length) {
							cursorPos++;
							writeEmitter?.fire("\x1b[C"); // move cursor right
						}
					} else if (
						charCode >= 0 &&
						charCode <= 31 &&
						charCode !== 13 &&
						charCode !== 27
					) {
					} else {
						line = line.slice(0, cursorPos) + data + line.slice(cursorPos);
						cursorPos += data.length;
						writeEmitter?.fire(
							data +
								line.slice(cursorPos) +
								"\x1b[" +
								(line.slice(cursorPos).length + 1) +
								"D"
						);
						writeEmitter?.fire("\x1b[C"); // move cursor right
					}
				},
			};

			terminal = vscode.window.createTerminal({
				name: "BuzzCode",
				pty: terminalPty,
			});

			terminal.show();
		});

		await terminalReady;

		/* -----------------------CONSTRUCTOR ----------------------*/
		if (!terminalProcess || !terminalPty || !terminal || !writeEmitter) {
			throw new Error("Terminal creation failed. Some components are missing.");
		}
		return new TerminalObject(
			terminalProcess,
			terminalPty,
			terminal,
			writeEmitter,
			signal,
			readOnly
		);
	}

	async executeCommand(
		command: string,
		subtaskIndex: number,
		warn = true
	): Promise<CommandResult | "Cancelled"> {
		const continuousMode: boolean | undefined = vscode.workspace
			.getConfiguration("buzzcode")
			.get("continuousMode");

		if (continuousMode) {
			warn = false;
		}

		return new Promise(async (resolve, reject) => {
			this.signal.onabort = () => {
				resolve(RETURN_CANCELLED);
				return;
			};
			if (warn) {
				const userResponse = await vscode.window.showWarningMessage(
					`Are you sure you want to run the following command: ${command}?`,
					{ modal: true },
					"Yes",
					"No"
				);

				if (!userResponse || userResponse === "No") {
					resolve(RETURN_CANCELLED);
					return;
				}
			}
			this.currentSubtaskIndex = subtaskIndex;
			const endOfCommandDelimiter = "SUBTASK_" + subtaskIndex + "_END";

			this.promiseHandlers.set(subtaskIndex, [resolve, reject]);

			// TODO: Find a proper way to make stderr and stdout output in chronological order
			if (shell === "bash") {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			this.terminalProcess.stdin?.write(
				`${command} ; echo ${endOfCommandDelimiter}\n`
			);

			if (shell === "bash") {
				this.writeEmitter.fire(`${command}\n\r`);
			}
		});
	}

	async generateFile(
		fileName: string,
		fileContents: string,
		subtaskIndex: number,
		warn = true
	): Promise<CommandResult | "Cancelled"> {
		return new Promise(async (resolve, reject) => {
			this.signal.onabort = () => {
				resolve(RETURN_CANCELLED);
				return;
			};

			const continuousMode = vscode.workspace
				.getConfiguration("buzzcode")
				.get("continuousMode");

			if (continuousMode) {
				warn = false;
			}

			if (warn) {
				const overwrite = await vscode.window.showWarningMessage(
					`If '${fileName}' already exists, this action will overwrite it. Do you want to proceed?`,
					{ modal: true },
					"Yes"
				);
				if (overwrite !== "Yes") {
					resolve(RETURN_CANCELLED);
					return;
				}
			}

			// Create a temporary file with the contents
			const tempFile = tmp.fileSync();
			fs.writeFileSync(tempFile.name, fileContents);

			// Copy the temporary file to the destination file using the terminal
			let copyCommand: string;

			if (process.platform === "win32") {
				copyCommand = `Copy-Item -Path ${tempFile.name} -Destination ${fileName} -Force`;
			} else {
				copyCommand = `cp -f ${tempFile.name} ${fileName}`;
			}

			const result = await this.executeCommand(
				copyCommand,
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

export function containsError(message: string): boolean {
	const errorMessages = [
		"error",
		"exception",
		"failed",
		"not found",
		"unable to",
		"invalid",
		"fatal",
		"errno",
		"no such file or directory",
	];

	for (let i = 0; i < errorMessages.length; i++) {
		if (message.toLowerCase().includes(errorMessages[i])) {
			return true;
		}
	}

	return false;
}

export function parseErrorMessage(errorString: string): string {
	let start = errorString.indexOf("\n\r\n\r") + 4; // find the start of the error message
	let end = errorString.indexOf("\n\r", start); // find the end of the error message
	if (start < 0 || end < 0) {
		// if either index is not found
		return errorString;
	}
	// TODO: Fix this
	return errorString; // .substring(start, end); // return the error message
}
