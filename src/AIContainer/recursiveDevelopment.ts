import * as vscode from "vscode";
import { queryGPTFunctionCalling } from "./queryGPTFunctionCalling";
import { askUser } from "./askUser";
import { initializePrompt } from "./prompts";
import { TerminalObject, CommandResult } from "../objects/terminalObject";
import { Subtask } from "../objects/subtask";
import { delay, shell } from "../settings/configuration";

var recursionLimit = 100;
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
	return new Promise(async (resolve, reject) => {
		taskDescription = input; // Saves original task description
		recursionCount = 0;

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
	terminalOutput = "";
	askUserResponse = "";

	return new Promise(async (resolve, reject) => {
		recursionCount++;
		if (recursionCount >= recursionLimit) {
			resolve("Error: Recursion limit reached");
			return;
		}

		var responseString: string = await queryGPTFunctionCalling(
			initializePrompt + input + "\n\nJSON subtask list:",
			signal
		);

		if (responseString.startsWith("[") && responseString.endsWith("]")) {
			responseString = `{"subtasks": ` + responseString + `}`;
		}

		if (responseString === "Cancelled") {
			resolve("Cancelled");
			return;
		} else if (responseString.startsWith("Error")) {
			resolve(responseString);
			return;
		}

		try {
			var subtasks: Array<Subtask> = JSON.parse(responseString).subtasks;

			// Set state of all subtasks to "initial"
			subtasks.forEach((subtask) => {
				subtask.state = "initial";
			});
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
						const commandResult: CommandResult | string =
							await terminalObj.executeCommand(command, subtask.index);

						if (typeof commandResult === "string") {
							resolve("Cancelled");
							return;
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
							resolve("Cancelled");
							return;
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
							resolve(result);
							return;
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
						throw Error(`Error: Unknown subtask type "${type}"`);
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
					resolve(result);
					return;
				}
			}
		}
		resolve();
	});
}
