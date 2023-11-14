import { Subtask, SubtaskState } from "./subtask";
import { initializePrompt } from "./prompts";
import { queryChatGPT } from "../helpers/queryChatGPT";
import { correctJson } from "../helpers/jsonFixGeneral";
import { RETURN_CANCELLED, ERROR_PREFIX } from "../settings/configuration";

/*
    INPUT: The user's task.
    OUTPUT: A json list of subtasks that can be executed by the agent.
*/
export async function plan(
	task: string,
	signal: AbortSignal
): Promise<string | Subtask[]> {
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
		responseString = correctJson(responseString);

		var subtasks: Array<Subtask> = JSON.parse(responseString).subtasks;

		subtasks.forEach((subtask) => {
			subtask.state = SubtaskState.initial;
		});
		if (subtasks.length - 1 !== subtasks[subtasks.length - 1].index) {
			throw new Error("Invalid subtask indices.");
		}
	} catch (error) {
		return ERROR_PREFIX + "Invalid JSON. \n" + (error as Error).message;
	}
	return subtasks;
}
