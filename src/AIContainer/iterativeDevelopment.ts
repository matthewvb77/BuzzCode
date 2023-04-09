import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeCommand } from "./AIHelpers/executeCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import {
	initializePrompt,
	taskPrompt,
	errorPrompt,
	newTaskPrompt,
} from "./prompts";

interface Instruction {
	type: string;
	parameters: any;
}

var recursionLimit = 10;
var recursionCount = 0;

export async function iterativeDevelopment(input: string) {
	var instructionsString: string | null = await queryChatGPT(
		initializePrompt + taskPrompt + input
	);

	if (instructionsString === null) {
		vscode.window.showErrorMessage("No instructions provided.");
		return;
	}

	const parsedObject = JSON.parse(instructionsString);
	const jsonInstructions: Array<Instruction> = parsedObject.instructions;

	if (recursionCount >= recursionLimit) {
		vscode.window.showErrorMessage("Recursion limit reached.");
		return;
	}

	for (const instruction of jsonInstructions) {
		const { type, parameters } = instruction;

		try {
			switch (type) {
				case "executeCommand":
					const { command } = parameters;
					const result = await executeCommand(command);
					if (result === "Cancelled by user.") {
						vscode.window.showInformationMessage(
							"User cancelled execution -- Terminating Process."
						);
						return;
					}
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					await generateFile(fileName, fileContents);
					break;

				case "startNextTask":
					const { newPrompt } = parameters;
					iterativeDevelopment(newPrompt);
					break;

				case "askUser":
					const { question } = parameters;
					const userResponse = await askUser(question);
					console.log(`User response:`, userResponse);
					break;

				default:
					console.warn(`Unknown instruction type "${type}"`);
					break;
			}
		} catch (error) {
			// If an error occurs, ask chatGPT for new instructions
			try {
				vscode.window.showInformationMessage(
					`Error occured: ${error}\n\n Fetching new instructions from the API...`
				);

				await iterativeDevelopment(
					errorPrompt + instruction + error + newTaskPrompt
				);
			} catch (apiError) {
				vscode.window.showErrorMessage(
					`Error fetching new instructions from the API:` + apiError
				);
			}
		}
	}
}
