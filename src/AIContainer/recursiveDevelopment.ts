import * as vscode from "vscode";
import { queryChatGPT } from "./queryChatGPT";
import { askUser } from "./askUser";
import { initializePrompt } from "./prompts";
import { TerminalObject } from "../objects/terminalObject";
import { Subtask } from "../objects/subtask";
import { delay, shell } from "../settings/configuration";
import { correctJson } from "../helpers/jsonFixGeneral";

var recursionLimit = 100; // Not important until continuous mode is implemented
var recursionCount = 0;
var taskDescription = ``;
var terminalOutput: Array<string> = [];
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
	return new Promise(async (resolve, reject) => {
		taskDescription = input; // Saves original task description
		recursionCount = 0;
		terminalOutput = [];

		if (terminalObj) {
			terminalObj.dispose();
		}
		try {
			terminalObj = await TerminalObject.create(signal);
		} catch (error) {
			resolve("Error: " + (error as Error).message);
			return;
		}

		const result = await recursiveDevelopmentHelper(
			taskDescription,
			terminalObj,
			signal,
			onStartSubtask,
			onSubtasksReady,
			onSubtaskError
		);

		// TODO: Replace this with better fix to issue: stderr and stdout aren't flushed in perfect chronological order
		if (shell === "bash") {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
		terminalObj.terminalPty.close();

		resolve(result);
	});
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
	return new Promise(async (resolve, reject) => {
		recursionCount++;
		if (recursionCount >= recursionLimit) {
			resolve("Error: Recursion limit reached");
			return;
		}

		var responseString: string = await queryChatGPT(
			initializePrompt + input + "\n\nJSON subtask list:",
			signal
		);

		if (responseString === "Cancelled") {
			resolve("Cancelled");
			return;
		} else if (responseString.startsWith("Error")) {
			resolve(responseString);
			return;
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
			resolve("Error: Invalid JSON. \n" + (error as Error).message);
			return;
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
					resolve(result);
					return;
				}
				resolve(result);
				return;

			case "cancel":
				resolve("Cancelled");
				return;

			default:
				resolve("Error: Invalid user action.");
				return;
		}

		for (const subtask of subtasks) {
			const { type, parameters } = subtask;
			onStartSubtask(subtask);

			try {
				switch (type) {
					case "executeTerminalCommand":
						const { command } = parameters;
						const commandResult = await terminalObj.executeCommand(
							command,
							subtask.index
						);
						terminalOutput.push(
							"Command: " + command + "\n" + "Output: " + commandResult
						);
						if (typeof commandResult === "string") {
							resolve("Cancelled");
							return;
						} else if (commandResult.error) {
							throw Error(commandResult.error);
						}
						break;

					case "generateFile":
						const { fileName, fileContents } = parameters;
						const fileCreationResult = await terminalObj.generateFile(
							fileName,
							fileContents,
							subtask.index
						);
						if (typeof fileCreationResult === "string") {
							resolve("Cancelled");
							return;
						} else if (fileCreationResult.error) {
							throw fileCreationResult.error;
						}
						break;

					case "recurse":
						const { newPrompt } = parameters;
						const result = await recursiveDevelopmentHelper(
							`Here is the original task: ` +
								taskDescription +
								`\nThis is a recursive call with the following prompt: ` +
								newPrompt +
								`\nHere is the output of the past terminal commands: \n` +
								terminalOutput +
								`\nGenerate a JSON list of next steps to take.\nJSON subtask list: `,
							terminalObj,
							signal,
							onStartSubtask,
							onSubtasksReady,
							onSubtaskError
						);

						if (typeof result === "string") {
							resolve(result);
							return;
						}

					case "askUser":
						const { question } = parameters;
						const userResponse = await askUser(question);
						await recursiveDevelopmentHelper(
							`Here is the original task: ` +
								taskDescription +
								`\n\nThis is a recursive call because askUser(${question}) was called. Here is the user's response: ` +
								userResponse,
							terminalObj,
							signal,
							onStartSubtask,
							onSubtasksReady,
							onSubtaskError
						);

					default:
						throw Error(`Error: Unknown subtask type "${type}"`);
				}
			} catch (error) {
				// If an error occurs, ask chatGPT for new subtasks
				vscode.window.showErrorMessage(
					// TODO: remove this debugging message
					"Error occured while executing subtask " +
						subtask.index +
						".\n" +
						(error as Error).message
				);

				onSubtaskError(subtask.index);

				const result = await recursiveDevelopmentHelper(
					`Here is the original task: ` +
						taskDescription +
						`\nDuring the execution of this subtask list:\n` +
						JSON.stringify(subtasks) +
						`\nThe following error occured:\n` +
						error +
						`\n\nGenerate a JSON list of subtasks to fix the issue.\nJSON subtask list: `,
					terminalObj,
					signal,
					onStartSubtask,
					onSubtasksReady,
					onSubtaskError
				);

				if (typeof result === "string") {
					resolve(result);
					return;
				}
			}
		}
		resolve();
	});
}
