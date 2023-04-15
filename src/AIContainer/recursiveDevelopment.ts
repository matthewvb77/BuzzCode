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
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (subtasks: Array<Subtask>) => Promise<void | string>
): Promise<void | string> {
	taskDescription = input; // Saves original task description
	recursionCount = 0;
	return await recursiveDevelopmentHelper(
		taskDescription,
		onStartSubtask,
		onSubtasksReady
	);
}

async function recursiveDevelopmentHelper(
	input: string,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (subtasks: Array<Subtask>) => Promise<void | string>
): Promise<void | string> {
	try {
		recursionCount++;
		if (recursionCount >= recursionLimit) {
			vscode.window.showErrorMessage("Recursion limit reached.");
			return;
		}

		var subtasksString: string | null = await queryChatGPT(
			initializePrompt + taskPrompt + input
		);

		if (subtasksString === null) {
			vscode.window.showErrorMessage("No subtasks provided.");
			return;
		}

		var subtasks: Array<Subtask> = JSON.parse(subtasksString).subtasks;
	} catch (error) {
		vscode.window.showErrorMessage("Error occured: " + error);
		return "Error: " + error;
	}

	const userAction = await onSubtasksReady(subtasks);
	switch (userAction) {
		case "confirm":
			break;

		case "regenerate":
			return await recursiveDevelopmentHelper(
				input,
				onStartSubtask,
				onSubtasksReady
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
					const result = await executeTerminalCommand(command);
					if (typeof result === "string") {
						return "Cancelled";
					} else if (result.error) {
						throw result.error;
					}
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					await generateFile(fileName, fileContents);
					break;

				case "recurse":
					const { newPrompt } = parameters;
					await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive call with the following prompt: ` +
							newPrompt,
						onStartSubtask,
						onSubtasksReady
					);
					break;

				case "askUser":
					const { question } = parameters;
					const userResponse = await askUser(question);
					await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive call because askUser(${question}) was called. Here is the user's response: ` +
							userResponse,
						onStartSubtask,
						onSubtasksReady
					);
					break;

				default:
					console.warn(`Unknown subtask type "${type}"`);
					break;
			}
		} catch (error) {
			// If an error occurs, ask chatGPT for new subtasks

			await recursiveDevelopmentHelper(
				`Here is the original task: ` +
					taskDescription +
					`\n\nThis is a recursive call because while this subtask was executed:` +
					JSON.stringify(subtask) +
					`\nThe following error occured:\n\n` +
					error +
					`\n\nThink about why this error occured and how to fix it.`,
				onStartSubtask,
				onSubtasksReady
			);
		}
	}
}
