import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeTerminalCommand } from "./AIHelpers/executeTerminalCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { initializePrompt } from "./prompts";
import * as cp from "child_process";
export interface Subtask {
	index: number;
	type: string;
	parameters: any;
}

var recursionLimit = 10;
var recursionCount = 0;
var taskDescription = ``;
var terminalProcess: cp.ChildProcess | undefined;
var platform = process.platform;
var shell = platform === "win32" ? "cmd.exe" : "bash";

export async function recursiveDevelopment(
	input: string,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<string>,
	onSubtaskError: (index: number) => void
): Promise<void | string> {
	taskDescription = input; // Saves original task description
	recursionCount = 0;
	if (terminalProcess) {
		terminalProcess.kill();
	}

	terminalProcess = cp.spawn(shell, [], {
		stdio: ["pipe", "pipe", "pipe"],
	});

	const result = await recursiveDevelopmentHelper(
		taskDescription,
		terminalProcess,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);

	terminalProcess.kill();
	return result;
}

async function recursiveDevelopmentHelper(
	input: string,
	terminalProcess: cp.ChildProcess,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<string>,
	onSubtaskError: (index: number) => void
): Promise<void | string> {
	recursionCount++;
	if (recursionCount >= recursionLimit) {
		vscode.window.showErrorMessage("Recursion limit reached.");
		return;
	}

	var responseString: string = await queryChatGPT(
		initializePrompt + input,
		signal
	);

	if (responseString === "Cancelled") {
		return "Cancelled";
	} else if (responseString === "Error") {
		return "Error";
	}

	try {
		// Regular expression to match JSON
		const jsonRegex = /{[\s\S]*}/;

		// Extract JSON and reasoning strings
		let jsonStringArray = responseString.match(jsonRegex);
		if (!jsonStringArray) {
			throw Error("No JSON found.");
		}
		let jsonString = jsonStringArray[0];
		let reasoning = responseString.replace(jsonRegex, "").trim();

		var subtasks: Array<Subtask> = JSON.parse(jsonString).subtasks;
		if (subtasks.length - 1 !== subtasks[subtasks.length - 1].index) {
			throw Error("Invalid subtask indices.");
		}
		if (reasoning) {
			vscode.window.showInformationMessage("Reasoning:\n" + reasoning);
		}
	} catch (error) {
		vscode.window.showErrorMessage(
			"OpenAI API returned invalid JSON. Error: " + error
		);
		return "Error";
	}

	var userAction = await onSubtasksReady(subtasks, signal);

	switch (userAction) {
		case "confirm":
			break;

		case "regenerate":
			return await recursiveDevelopmentHelper(
				input,
				terminalProcess,
				signal,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);

		case "cancel":
			return "Cancelled";

		default:
			return "Error";
	}

	for (const subtask of subtasks) {
		const { type, parameters } = subtask;
		onStartSubtask(subtask);

		try {
			switch (type) {
				case "executeTerminalCommand":
					const { command } = parameters;
					const commandResult = await executeTerminalCommand(
						command,
						terminalProcess
					);
					if (typeof commandResult === "string") {
						return "Cancelled";
					} else if (commandResult.error) {
						throw commandResult.error;
					}
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					const fileCreationResult = await generateFile(
						fileName,
						fileContents,
						terminalProcess
					);
					if (typeof fileCreationResult === "string") {
						return "Cancelled";
					}
					break;

				case "recurse":
					const { newPrompt } = parameters;
					return await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive call with the following prompt: ` +
							newPrompt,
						terminalProcess,
						signal,
						onStartSubtask,
						onSubtasksReady,
						onSubtaskError
					);

				case "askUser":
					const { question } = parameters;
					const userResponse = await askUser(question);
					return await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive call because askUser(${question}) was called. Here is the user's response: ` +
							userResponse,
						terminalProcess,
						signal,
						onStartSubtask,
						onSubtasksReady,
						onSubtaskError
					);

				default:
					console.warn(`Unknown subtask type "${type}"`);
					break;
			}
		} catch (error) {
			// If an error occurs, ask chatGPT for new subtasks

			onSubtaskError(subtask.index);

			return await recursiveDevelopmentHelper(
				`Here is the original task: ` +
					taskDescription +
					`\n\nThis is a recursive call because while this subtask was executed:` +
					JSON.stringify(subtask) +
					`\nThe following error occured:\n\n` +
					error +
					`\n\nGenerate a JSON list of subtasks to fix the issue.`,
				terminalProcess,
				signal,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);
		}
	}
}
