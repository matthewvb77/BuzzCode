import * as vscode from "vscode";
import { Subtask, SubtaskState } from "./subtask";
import { initializePrompt, planningPrompt } from "./prompts";
import { queryChatGPT } from "../helpers/queryChatGPT";
import { correctJson } from "../helpers/jsonFixGeneral";
import { RETURN_CANCELLED, ERROR_PREFIX } from "../settings/configuration";

/*
    INPUT: The user's task.
    OUTPUT: A list of subtasks that can be executed by the agent.
*/
export async function plan(
	task: string,
	signal: AbortSignal
): Promise<string | Subtask[]> {
	// TODO: Add planning here
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
			subtask.state = SubtaskState.initial;
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
	return [];
}
