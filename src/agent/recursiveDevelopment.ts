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
	}

	/* ----------------------- Initial Questions Phase ----------------------- */

	var questionsResponse: string = await queryChatGPT(
		prompt + input + `\n\nJSON questions list:`,
		signal
	);

	var questions = await validateJSON(input, AgentPhase.questions, signal);

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

	var response = executeSubtasks(
		questionsSubtasks,
		terminalObj,
		input,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);

	if (typeof response === "string") {
		return response;
	}

	/* ---------------------- High Level Planning ---------------------- */

	var steps = await validateJSON(input, AgentPhase.questions, signal);

	if (typeof steps === "string") {
		return steps;
	}

	/* ---------------------- Subtask Planning ---------------------- */
	steps.forEach((step: string, index: number) => {});
	var responseString: string = await queryChatGPT(
		planningPrompt + input + "\n\nJSON subtask list:",
		signal
	);

	if (responseString.startsWith("[") && responseString.endsWith("]")) {
		responseString = `{"subtasks": ${responseString}}`;
	}

	if (responseString === RETURN_CANCELLED) {
		return RETURN_CANCELLED;
	} else if (responseString.startsWith("Error")) {
		return responseString;
	}

	try {
		// Regular expression to match JSON
		const jsonRegex = /{[\s\S]*}/;

		// Extract JSON and reasoning strings
		var jsonQuestionsStringArray: Array<string> | null = null;
		try {
			jsonQuestionsStringArray = responseString.match(jsonRegex);
		} catch (error) {
			jsonQuestionsStringArray = correctJson(responseString).match(jsonRegex);
		}
		if (!jsonQuestionsStringArray) {
			throw new Error("No JSON found.");
		}
		let jsonString = jsonQuestionsStringArray[0];
		let reasoning = responseString
			.replace(jsonRegex, "")
			.trim()
			.split("Response: ")[0];

		jsonString = correctJson(jsonString);

		var subtasks: Array<Subtask> = JSON.parse(jsonString).subtasks;

		subtasks.forEach((subtask) => {
			subtask.state = SubtaskState.initial;
		});
		if (subtasks.length - 1 !== subtasks[subtasks.length - 1].index) {
			throw new Error("Invalid subtask indices.");
		}
		if (reasoning) {
			vscode.window.showInformationMessage("Reasoning:\n" + reasoning);
		}
	} catch (error) {
		return ERROR_PREFIX + "Invalid JSON. \n" + (error as Error).message;
	}
	/* ---------------- Execution Phase ---------------- */

	if (typeof subtasks === "string") {
		return subtasks;
	}

	return executeSubtasks(
		subtasks,
		terminalObj,
		input,
		signal,
		onStartSubtask,
		onSubtasksReady,
		onSubtaskError
	);
}

enum AgentPhase {
	questions = "question",
	highLevelPlanning = "step",
	planning = "subtask",
}

async function validateJSON(
	task: string,
	phase: AgentPhase,
	signal: AbortSignal
): Promise<any | string> {
	var prompt: string = "";
	switch (phase) {
		case AgentPhase.questions:
			prompt = questionPrompt;
			break;
		case AgentPhase.highLevelPlanning:
			prompt = highLevelPlanningPrompt;
			break;
		case AgentPhase.planning:
			prompt = planningPrompt;
			break;
		default:
			return ERROR_PREFIX + "Invalid phase.";
	}

	var response: string = await queryChatGPT(
		prompt + task + `\n\nJSON ${phase} list:`,
		signal
	);

	// Check for common formatting errors
	if (response.startsWith("[") && response.endsWith("]")) {
		response = `{"${phase}s": ${response}}`;
	}

	if (response === RETURN_CANCELLED) {
		return RETURN_CANCELLED;
	} else if (response.startsWith("Error")) {
		return response;
	}

	try {
		// Regular expression to match JSON
		const jsonRegex = /{[\s\S]*}/;

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
