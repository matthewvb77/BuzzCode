import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeCommand } from "./AIHelpers/executeCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import {
	initializePrompt,
	taskPrompt,
	errorPrompt,
	newTaskPrompt,
} from "./prompts";

export async function iterativeDevelopment(input: string) {
	if (!hasValidAPIKey()) {
		vscode.window.showErrorMessage("No valid API key found.");
		return;
	}

	var instructionsString = await queryChatGPT(
		initializePrompt + taskPrompt + input
	);

	if (!instructionsString) {
		vscode.window.showErrorMessage("No instructions provided.");
		return;
	}

	const parsedObject = JSON.parse(instructionsString);
	const jsonInstructions: Array<Instruction> = parsedObject.instructions;

	executeInstructions(jsonInstructions);
}

interface Instruction {
	type: string;
	parameters: any;
}

var recursionLimit = 5;
var recursionCount = 0;
async function executeInstructions(jsonInstructions: Array<Instruction>) {
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
					console.log(`Command executed: ${command}\nResult:`, result);
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					await generateFile(fileName, fileContents);
					break;

				case "queryChatGPT":
					const { prompt } = parameters;
					const apiResponse = await queryChatGPT(prompt);
					console.log(`Query response:`, apiResponse);
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
				const apiResponse = await queryChatGPT(
					initializePrompt + errorPrompt + error + newTaskPrompt
				);
				vscode.window.showInformationMessage(`blah`);
				console.log(`New instructions from the API:`, apiResponse);

				if (!apiResponse) {
					vscode.window.showErrorMessage("No instructions provided.");
					return;
				}
				const newInstructions = JSON.parse(apiResponse).instructions;
				await executeInstructions(newInstructions);
			} catch (apiError) {
				console.error(
					`Error fetching new instructions from the API:`,
					apiError
				);
			}
		}
	}
}
