import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeTerminalCommand } from "./AIHelpers/executeTerminalCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { initializePrompt, taskPrompt } from "./prompts";
export interface Subtask {
	index: number;
	type: string;
	parameters: any;
}

var recursionLimit = 10;
var recursionCount = 0;
var taskDescription = ``;
export async function recursiveDevelopment(
	input: string,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<void | string>,
	onSubtaskError: () => void
): Promise<void | string> {
	taskDescription = input; // Saves original task description
	recursionCount = 0;
	return await recursiveDevelopmentHelper(
		taskDescription,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);
}

async function recursiveDevelopmentHelper(
	input: string,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<void | string>,
	onSubtaskError: () => void
): Promise<void | string> {
	try {
		recursionCount++;
		if (recursionCount >= recursionLimit) {
			vscode.window.showErrorMessage("Recursion limit reached.");
			return;
		}

		var subtasksString: string = await queryChatGPT(
			initializePrompt + taskPrompt + input,
			signal
		);

		if (subtasksString === "Cancelled") {
			return "Cancelled";
		} else if (subtasksString === "Error") {
			return "Error";
		}

		var subtasks: Array<Subtask> = JSON.parse(subtasksString).subtasks;
	} catch (error) {
		vscode.window.showErrorMessage("Error occured: " + error);
		return "Error: " + error;
	}

	try {
		var userAction = await onSubtasksReady(subtasks, signal);
	} catch (error) {
		if ((error as Error).name === "AbortError") {
			return "Cancelled";
		} else {
			vscode.window.showErrorMessage("Error occured: " + error);
			return "Error";
		}
	}

	switch (userAction) {
		case "confirm":
			break;

		case "regenerate":
			return await recursiveDevelopmentHelper(
				input,
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
					const commandResult = await executeTerminalCommand(command);
					if (typeof commandResult === "string") {
						return "Cancelled";
					} else if (commandResult.error) {
						throw commandResult.error;
					}
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					const fileCreationResult = await generateFile(fileName, fileContents);
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

			onSubtaskError();

			return await recursiveDevelopmentHelper(
				`Here is the original task: ` +
					taskDescription +
					`\n\nThis is a recursive call because while this subtask was executed:` +
					JSON.stringify(subtask) +
					`\nThe following error occured:\n\n` +
					error +
					`\n\nThink about why this error occured and how to fix it.`,
				signal,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);
		}
	}
}
