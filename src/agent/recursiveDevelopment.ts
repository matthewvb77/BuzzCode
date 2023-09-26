import * as vscode from "vscode";
import { TerminalObject, CommandResult } from "./terminalObject";
import { askUser } from "./askUser";
import {
	delay,
	shell,
	RETURN_CANCELLED,
	ERROR_PREFIX,
	RECURSION_LIMIT,
} from "../settings/configuration";
import { Subtask, SubtaskState } from "./subtask";
import { queryChatGPT } from "../helpers/queryChatGPT";
import { correctJson } from "../helpers/jsonFixGeneral";
import {
	questionPrompt,
	highLevelPlanningPrompt,
	planningPrompt,
} from "./prompts";

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
		true,
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
	question: boolean,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<string>,
	onSubtaskError: (index: number) => void
): Promise<void | string> {
	/* These global variables will be added to during execution */
	terminalOutput = "";
	askUserResponse = "";

	recursionCount++;
	if (recursionCount >= RECURSION_LIMIT) {
		return ERROR_PREFIX + "Recursion limit reached";
	}

	/* ----------------------- Initial Questions Phase ----------------------- */
	if (question) {
		var questionsResponse: string = await queryChatGPT(
			questionPrompt + input + `\n\nJSON questions list:`,
			signal
		);

		var questions = validateJSON(questionsResponse, AgentPhase.questions);

		if (typeof questions === "string") {
			return questions;
		}

		var questionsSubtasks: Array<Subtask> = questions.map(
			(question: string, index: number) => {
				return {
					index,
					type: "askUser",
					parameters: {
						question,
					},
					state: SubtaskState.initial,
				};
			}
		);

		var responseStatus: void | string = await executeSubtasks(
			questionsSubtasks,
			terminalObj,
			input,
			signal,
			onStartSubtask,
			onSubtasksReady,
			onSubtaskError
		);

		if (typeof responseStatus === "string") {
			return responseStatus;
		}
	}

	/* ---------------------- High Level Planning ---------------------- */

	var planningResponse: string = await queryChatGPT(
		highLevelPlanningPrompt +
			input +
			`\n\nInitial questions posed to the user: ` +
			askUserResponse +
			`\n\nJSON steps list: `,
		signal
	);

	var steps = validateJSON(planningResponse, AgentPhase.questions);

	if (typeof steps === "string") {
		return steps;
	}

	/* ---------------------- Subtask Planning ---------------------- */

	var subtasks: Array<Subtask> = [];

	for (const step of steps) {
		var responseString: string = await queryChatGPT(
			planningPrompt + step + "\n\nJSON subtask list:",
			signal
		);

		var currSubtasks: any = validateJSON(responseString, AgentPhase.planning);
		if (typeof currSubtasks === "string") {
			return currSubtasks;
		}

		currSubtasks.forEach((subtask: Subtask) => {
			subtasks.push(subtask);
		});
	}

	subtasks.forEach((subtask) => {
		subtask.state = SubtaskState.initial;
		subtask.index = subtasks.indexOf(subtask);
	});

	/* ---------------- Execution Phase ---------------- */

	return await executeSubtasks(
		subtasks,
		terminalObj,
		input,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);
}

export enum AgentPhase {
	questions = "question",
	highLevelPlanning = "step",
	planning = "subtask",
}

export function validateJSON(response: string, phase: AgentPhase) {
	// Check for common formatting errors

	if (response === RETURN_CANCELLED || response.startsWith(ERROR_PREFIX)) {
		return response;
	}

	try {
		// Regular expression to match JSON
		const jsonRegex = /(\[.*?\])/s;

		// Extract JSON and reasoning strings
		var jsonStringArray: Array<string> | null = null;
		try {
			jsonStringArray = response.match(jsonRegex);
		} catch (error) {
			// I don't remember why, but executing correctJSON twice is intentional
			jsonStringArray = correctJson(response).match(jsonRegex);
		}
		if (!jsonStringArray) {
			throw new Error("No JSON found.");
		}
		let jsonString = jsonStringArray[0];

		jsonString = correctJson(jsonString);

		return JSON.parse(jsonString);
	} catch (error) {
		return ERROR_PREFIX + "Invalid JSON. \n" + (error as Error).message;
	}
}

/*
Returns void if successful, or a string if an error or cancellation occurs
*/
async function executeSubtasks(
	subtasks: Array<Subtask>,
	terminalObj: TerminalObject,
	input: string,
	signal: AbortSignal,
	onStartSubtask: (subtask: Subtask) => void,
	onSubtasksReady: (
		subtasks: Array<Subtask>,
		signal: AbortSignal
	) => Promise<string>,
	onSubtaskError: (index: number) => void
): Promise<void | string> {
	if (subtasks.length === 0) {
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
				false,
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
		onStartSubtask(subtask);
		const { type, parameters } = subtask;
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

				case "recurse":
					const { newPrompt } = parameters;
					let recurseInput: string = `This is a recursive call with the original task: { ${taskDescription} }\n And the new prompt: { ${newPrompt} }\n`;

					if (terminalOutput) {
						recurseInput += `\nHere are the outputs of executed terminal commands: [ ${terminalOutput} ]\n`;
					}
					if (askUserResponse) {
						recurseInput += `\nHere are the user's responses to questions: [ ${askUserResponse} ]\n`;
					}

					const result = await recursiveDevelopmentHelper(
						recurseInput,
						terminalObj,
						signal,
						true,
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
							`{ Question: { ${question} }\n` +
							`Response: { ${await askUser(question)} }\n }, \n`;
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
			if (askUserResponse) {
				input += `Here are the user's responses to questions: ${askUserResponse}\n\n`;
			}
			if (error) {
				input += `The following error occured: { ${error} \n}`;
			}

			const result = await recursiveDevelopmentHelper(
				input,
				terminalObj,
				signal,
				false,
				onStartSubtask,
				onSubtasksReady,
				onSubtaskError
			);

			if (typeof result === "string") {
				return result;
			}
		}
	}
}
