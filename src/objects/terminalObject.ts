import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
import * as merge2 from "merge2";
import { shell, shellArgs, delay } from "../settings/configuration";

export type CommandResult = {
	error: string;
	stdout: string;
	stderr: string;
};

/*
	THE "CREATE" STATIC ASYNCHRONOUS FACTORY METHOD MUST BE USED -- NOT THE CONSTRUCTOR.
*/
export class TerminalObject {
	terminalProcess: cp.ChildProcess;
	terminalPty!: vscode.Pseudoterminal;
	terminal!: vscode.Terminal;
	writeEmitter!: vscode.EventEmitter<string>;
	signal: AbortSignal;

	outputStream: merge2.Merge2Stream | null = null;
	readOnly: boolean = false;
	currentSubtaskIndex: number | null = null;

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
				const endOfCommandDelimiter =
					"----------END_OF_COMMAND_SUBTASK_" +
					this.currentSubtaskIndex +
					"----------";

				if (
					dataString.includes(endOfCommandDelimiter) &&
					!dataString.includes("echo " + endOfCommandDelimiter)
				) {
					//TODO: Super inefficient. Fix this condition.

					this.writeEmitter.fire(dataString.split(endOfCommandDelimiter)[0]);

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

				// check output for error
				if (containsError(dataString)) {
					const result = {
						error: dataString,
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
				const [, reject] =
					this.promiseHandlers.get(this.currentSubtaskIndex) || [];
				if (reject) {
					reject(error);
					this.promiseHandlers.delete(this.currentSubtaskIndex);
				}
			}
		});
	}

	/*
		Since the PseudoTerminal creation is asynchronous, this factory method is necessary
	 */
	static async create(signal: AbortSignal) {
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
			vscode.window.showErrorMessage("No workspace folder open.");
			throw new Error("No workspace folder open.");
		}

		terminalProcess = cp.spawn(shell, shellArgs, {
			cwd: workingDirectory,
			env: process.env,
		});

		var terminalReady = new Promise<void>((resolve) => {
			writeEmitter = new vscode.EventEmitter<string>();
			let line = "";
			terminalPty = {
				onDidWrite: writeEmitter.event,
				open: () => {
					writeEmitter?.fire(
						"------------------------Testwise: TASK STARTED------------------------\r\n\r\n"
					);
					resolve();
				},
				close: () => {
					terminalProcess?.kill();
					readOnly = true;
					writeEmitter?.fire(
						"\r\n\r\n------------------------Testwise: TASK STOPPED------------------------"
					);
				},
				handleInput: (data: string) => {
					if (readOnly) {
						return;
					}

					if (terminalProcess === undefined) {
						vscode.window.showErrorMessage("Terminal process is undefined.");
						return "Error";
					}

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
						return;
					} else if (data === "\x7f") {
						if (line.length === 0) {
							return;
						}
						line = line.slice(0, -1);
						writeEmitter?.fire("\x1b[D"); // move cursor left
						writeEmitter?.fire("\x1b[P"); // Delete character
					} else {
						line += data;
					}

					writeEmitter?.fire(data);
				},
			};

			terminal = vscode.window.createTerminal({
				name: "Testwise",
				pty: terminalPty,
			});

			terminal.show();
		});

		await terminalReady;

		/* -----------------------CONSTRUCTOR ----------------------*/
		if (!terminalProcess || !terminalPty || !terminal || !writeEmitter) {
			throw new Error("Terminal creation failed. Critical components missing.");
		}
		const terminalObject = new TerminalObject(
			terminalProcess,
			terminalPty,
			terminal,
			writeEmitter,
			signal,
			readOnly
		);
		return terminalObject;
	}

	async executeCommand(
		command: string,
		subtaskIndex: number,
		warn = true
	): Promise<CommandResult | "Cancelled"> {
		const continuousMode = vscode.workspace
			.getConfiguration("testwise")
			.get("continuousMode");

		if (continuousMode) {
			warn = false;
		}

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

			const commandSeparator = shell === "powershell.exe" ? ";" : "&&";

			this.promiseHandlers.set(subtaskIndex, [resolve, reject]);

			// TODO: Find a proper way to make stderr and stdout output in chronological order
			if (shell === "bash") {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			this.terminalProcess.stdin?.write(
				`${command} ${commandSeparator} echo ${endOfCommandDelimiter}\n`
			);

			if (shell === "bash") {
				this.writeEmitter.fire(`${command}\n\r`);
			}
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

			const continuousMode = vscode.workspace
				.getConfiguration("testwise")
				.get("continuousMode");

			if (!continuousMode) {
				const overwrite = await vscode.window.showWarningMessage(
					`If '${fileName}' already exists, this action will overwrite it. Do you want to proceed?`,
					{ modal: true },
					"Yes"
				);
				if (overwrite !== "Yes") {
					resolve("Cancelled");
					return;
				}
			}

			// Create a temporary file with the contents
			const tempFile = tmp.fileSync();
			fs.writeFileSync(tempFile.name, contents);

			// Copy the temporary file to the destination file using the terminal
			const copyCommand = process.platform === "win32" ? "copy /Y" : "cp -f";

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

function containsError(message: string): boolean {
	const errorMessages = [
		"error",
		"exception",
		"failed",
		"not found",
		"unable to",
		"invalid",
	];

	for (let i = 0; i < errorMessages.length; i++) {
		if (message.toLowerCase().includes(errorMessages[i])) {
			return true;
		}
	}

	return false;
}
