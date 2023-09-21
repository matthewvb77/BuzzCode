import * as vscode from "vscode";
import { Subtask, SubtaskState } from "./subtask";
import { initializePrompt, highLevelPlanningPrompt } from "./prompts";
import { queryChatGPT } from "../helpers/queryChatGPT";
import { correctJson } from "../helpers/jsonFixGeneral";
import { RETURN_CANCELLED, ERROR_PREFIX } from "../settings/configuration";
import { askUser } from "./askUser";

/*
    INPUT: The user's task.
    OUTPUT: A list of subtasks that can be executed by the agent.
*/
export async function plan(
	task: string,
	signal: AbortSignal
): Promise<string | Subtask[]> {
	/* ---------------------- Ask User Questions ---------------------- */

	var responseQuestions: string = await queryChatGPT(
		highLevelPlanningPrompt + task + "\n\nJSON question list:",
		signal
	);

	if (responseQuestions.startsWith("[") && responseQuestions.endsWith("]")) {
		responseString = `{"questions": ${responseQuestions}}`;
	}

	if (responseQuestions === RETURN_CANCELLED) {
		return RETURN_CANCELLED;
	} else if (responseQuestions.startsWith("Error")) {
		return responseQuestions;
	}

	/* -------------------------- Parse Questions -------------------------- */

	try {
		// Regular expression to match JSON
		const jsonRegex = /{[\s\S]*}/;

		// Extract JSON and reasoning strings
		var jsonQuestionsStringArray: Array<string> | null = null;
		try {
			jsonQuestionsStringArray = responseQuestions.match(jsonRegex);
		} catch (error) {
			jsonQuestionsStringArray =
				correctJson(responseQuestions).match(jsonRegex);
		}
		if (!jsonQuestionsStringArray) {
			throw new Error("No JSON found.");
		}
		let questionsString = jsonQuestionsStringArray[0];

		questionsString = correctJson(questionsString);

		var questions: Array<string> = JSON.parse(questionsString).questions;
		var askUserResponse: string = "";

		// NOTE FOR TOMORROW: THIS WHOLE FILE MIGHT HAVE TO GO BACK INTO RECURSIVE DEVELOPMENT. OR WE COULD PASS THE SUBTASKUPDATE FUNCTIONS AS CALLBACKS INTO THIS FUNCTION
		questions.forEach((question) => {
			askUserResponse +=
				`{ Question: { ${question} }\n` +
				`Response: { ${await askUser(question)} }\n }, \n`;
		});
	} catch (error) {
		return ERROR_PREFIX + "Invalid JSON. \n" + (error as Error).message;
	}

	/* ---------------------- Subtask Planning ---------------------- */

	var responseString: string = await queryChatGPT(
		initializePrompt + task + "\n\nJSON subtask list:",
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
	return subtasks;
}
