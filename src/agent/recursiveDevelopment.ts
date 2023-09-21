import * as vscode from "vscode";
import { TerminalObject, CommandResult } from "./terminalObject";
import { Subtask } from "./subtask";
import {
	delay,
	shell,
	RETURN_CANCELLED,
	ERROR_PREFIX,
	RECURSION_LIMIT,
} from "../settings/configuration";
import { plan } from "./plan";

var recursionCount = 0;
var taskDescription = ``;
var terminalOutput: string = "";
// var askUserResponse: string = "";  TEMPORARILY REMOVED
var terminalObj: TerminalObject | null = null;

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

	if (terminalObj) {
		terminalObj.dispose();
	}
	try {
		terminalObj = await TerminalObject.create(signal);
	} catch (error) {
		return ERROR_PREFIX + (error as Error).message;
	}

	const result = await recursiveDevelopmentHelper(
		taskDescription,
		terminalObj,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);

	// stderr and stdout aren't flushed in perfect chronological order, and there's no way to fix this, making delays necessary
	if (shell === "bash") {
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
	terminalObj.terminalPty.close();

	return result;
}

async function recursiveDevelopmentHelper(
	input: string,
	terminalObj: TerminalObject,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<string>,
	onSubtaskError: (index: number) => void
): Promise<void | string> {
	terminalOutput = "";
	// askUserResponse = ""; TEMPORARILY REMOVED

	recursionCount++;
	if (recursionCount >= RECURSION_LIMIT) {
		return ERROR_PREFIX + "Recursion limit reached";
	}

	var subtasks: string | Array<Subtask> = await plan(input, signal);
	if (typeof subtasks === "string") {
		return subtasks;
	}

	var userAction = await onSubtasksReady(subtasks, signal);

	switch (userAction) {
		case "confirm":
			break;

		case "regenerate":
			const result = await recursiveDevelopmentHelper(
				input,
				terminalObj,
				signal,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);

			if (typeof result === "string") {
				return result;
			}
			return result;

		case "cancel":
			return RETURN_CANCELLED;

		default:
			return ERROR_PREFIX + "Invalid user action.";
	}

	for (const subtask of subtasks) {
		const { type, parameters } = subtask;
		onStartSubtask(subtask);

		try {
			switch (type) {
				case "executeTerminalCommand":
					const { command } = parameters;
					const commandResult: CommandResult | string =
						await terminalObj.executeCommand(command, subtask.index);

					if (typeof commandResult === "string") {
						return RETURN_CANCELLED;
					} else if (commandResult.error) {
						throw Error(commandResult.error);
					}

					terminalOutput +=
						"{ Command: {" +
						command +
						"}\n" +
						"stdout: {" +
						commandResult.stdout +
						"}\n" +
						"stderr: {" +
						commandResult.stderr +
						"}\n" +
						"error: {" +
						commandResult.error +
						"}\n },\n";

					terminalOutput +=
						`{\nCommand: { ${command} }\n` +
						`stdout: { ${commandResult.stdout} }\n` +
						`stderr: { ${commandResult.stderr} }\n` +
						`error: { ${commandResult.error} }\n},\n`;

					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					const fileCreationResult = await terminalObj.generateFile(
						fileName,
						fileContents,
						subtask.index
					);
					if (typeof fileCreationResult === "string") {
						return RETURN_CANCELLED;
					} else if (fileCreationResult.error) {
						throw fileCreationResult.error;
					}
					break;

				/* RECURSE AND ASKUSER ARE BEING TEMPORARILY REMOVED */
				// case "recurse":
				// 	const { newPrompt } = parameters;
				// 	let recurseInput: string = `This is a recursive call with the original task: { ${taskDescription} }\n And the new prompt: { ${newPrompt} }\n`;

				// 	if (terminalOutput) {
				// 		recurseInput += `\nHere are the outputs of executed terminal commands: [ ${terminalOutput} ]\n`;
				// 	}
				// 	if (askUserResponse) {
				// 		recurseInput += `\nHere are the user's responses to questions: [ ${askUserResponse} ]\n`;
				// 	}

				// 	const result = await recursiveDevelopmentHelper(
				// 		recurseInput,
				// 		terminalObj,
				// 		signal,
				// 		onStartSubtask,
				// 		onSubtasksReady,
				// 		onSubtaskError
				// 	);

				// 	if (typeof result === "string") {
				// 		return result;
				// 	}

				// case "askUser":
				// 	const { question } = parameters;
				// 	try {
				// 		askUserResponse +=
				// 			`{ Question: { ${question} }\n` +
				// 			`Response: { ${await askUser(question)} }\n }, \n`;
				// 	} catch (error) {
				// 		throw error;
				// 	}

				// 	break;

				default:
					throw Error(ERROR_PREFIX + `Unknown subtask type "${type}"`);
			}
		} catch (error) {
			// If an error occurs, ask chatGPT for new subtasks
			vscode.window.showErrorMessage(
				`Error occured while executing subtask ${subtask.index}.\n` +
					(error as Error).message
			);

			onSubtaskError(subtask.index);

			let input =
				`Here is the original task: ${taskDescription}\n\n` +
				`Here is the past subtask list: { "subtasks": ${JSON.stringify(
					subtasks
				)}}\n\n`;

			if (terminalOutput) {
				input += `Here is the terminal output: ${terminalOutput}\n\n`;
			}
			// TEMPORARILY REMOVED
			// if (askUserResponse) {
			// 	input += `Here are the user's responses to questions: ${askUserResponse}\n\n`;
			// }
			if (error) {
				input += `The following error occured: { ${error} \n}`;
			}

			const result = await recursiveDevelopmentHelper(
				input,
				terminalObj,
				signal,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);

			if (typeof result === "string") {
				return result;
			}
		}
	}
	return;
}
