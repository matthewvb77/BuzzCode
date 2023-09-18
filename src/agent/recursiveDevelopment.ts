import * as vscode from "vscode";
import { queryChatGPT } from "../helpers/queryChatGPT";
import { askUser } from "./askUser";
import { initializePrompt } from "./prompts";
import { TerminalObject, CommandResult } from "../objects/terminalObject";
import { Subtask } from "../objects/subtask";
import { delay, shell } from "../settings/configuration";
import { correctJson } from "../helpers/jsonFixGeneral";

const CANCELLED = "Cancelled";
const ERROR_PREFIX = "Error: ";
const RECURSION_LIMIT = 100;

var recursionCount = 0;
var taskDescription = ``;
var terminalOutput: string = "";
var askUserResponse: string = "";
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
	askUserResponse = "";

	recursionCount++;
	if (recursionCount >= RECURSION_LIMIT) {
		return ERROR_PREFIX + "Recursion limit reached";
		return;
	}

	var responseString: string = await queryChatGPT(
		initializePrompt + input + "\n\nJSON subtask list:",
		signal
	);

	if (responseString.startsWith("[") && responseString.endsWith("]")) {
		responseString = `{"subtasks": ` + responseString + `}`;
	}

	if (responseString === CANCELLED) {
		return CANCELLED;
	} else if (responseString.startsWith("Error")) {
		return responseString;
	}

	try {
		// Regular expression to match JSON
		const jsonRegex = /{[\s\S]*}/;

		// Extract JSON and reasoning strings
		var jsonStringArray: Array<string> | null = null;
		try {
			jsonStringArray = responseString.match(jsonRegex);
		} catch (error) {
			jsonStringArray = correctJson(responseString).match(jsonRegex);
		}
		if (!jsonStringArray) {
			throw Error("No JSON found.");
		}
		let jsonString = jsonStringArray[0];
		let reasoning = responseString
			.replace(jsonRegex, "")
			.trim()
			.split("Response: ")[0];

		jsonString = correctJson(jsonString);

		var subtasks: Array<Subtask> = JSON.parse(jsonString).subtasks;

		subtasks.forEach((subtask) => {
			subtask.state = "initial";
		});
		if (subtasks.length - 1 !== subtasks[subtasks.length - 1].index) {
			throw Error("Invalid subtask indices.");
		}
		if (reasoning) {
			vscode.window.showInformationMessage("Reasoning:\n" + reasoning);
		}
	} catch (error) {
		return ERROR_PREFIX + "Invalid JSON. \n" + (error as Error).message;
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
			return CANCELLED;

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
						return CANCELLED;
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

					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					const fileCreationResult = await terminalObj.generateFile(
						fileName,
						fileContents,
						subtask.index
					);
					if (typeof fileCreationResult === "string") {
						return CANCELLED;
					} else if (fileCreationResult.error) {
						throw fileCreationResult.error;
					}
					break;

				case "recurse":
					const { newPrompt } = parameters;
					let recurseInput: string =
						`This is a recursive call with the original task: {` +
						`${taskDescription}}\n` +
						`And the new prompt: {${newPrompt}}\n`;

					if (terminalOutput) {
						recurseInput +=
							`\nHere are the outputs of executed terminal commands: [\n` +
							terminalOutput +
							`]\n`;
					}
					if (askUserResponse) {
						recurseInput +=
							`\nHere are the user's responses to questions: [\n` +
							askUserResponse +
							`]\n`;
					}

					const result = await recursiveDevelopmentHelper(
						recurseInput,
						terminalObj,
						signal,
						onStartSubtask,
						onSubtasksReady,
						onSubtaskError
					);

					if (typeof result === "string") {
						return result;
					}

				case "askUser":
					const { question } = parameters;
					try {
						askUserResponse +=
							"{ Question: {" +
							question +
							"}\n" +
							"Response: {" +
							(await askUser(question)) +
							"}\n }, \n";
					} catch (error) {
						throw error;
					}

					break;

				default:
					throw Error(ERROR_PREFIX + `Unknown subtask type "${type}"`);
			}
		} catch (error) {
			// If an error occurs, ask chatGPT for new subtasks
			vscode.window.showErrorMessage(
				"Error occured while executing subtask " +
					subtask.index +
					".\n" +
					(error as Error).message
			);

			onSubtaskError(subtask.index);

			const result = await recursiveDevelopmentHelper(
				`Here is the original task: ` +
					taskDescription +
					`\nHere is the past subtask list:\n` +
					`{ "subtasks": ${JSON.stringify(subtasks)}}` +
					`\nHere is the terminal output: \n` +
					terminalOutput +
					`\nHere are the user's responses to questions: \n` +
					askUserResponse +
					`\nThe following error occured: {\n` +
					error +
					`\n}`,
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
