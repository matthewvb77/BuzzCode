import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeCommand } from "./AIHelpers/executeCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import { initialize } from "./prompts";

export async function iterativeDevelopment(input: string) {
	if (!hasValidAPIKey()) {
		vscode.window.showErrorMessage("No valid API key found.");
		return;
	}

	var instructionsString = await queryChatGPT(initialize + input);

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

async function executeInstructions(jsonInstructions: Array<Instruction>) {
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
			console.error(`Error executing instruction:`, error);
			const prompt = `The following error occurred while executing instruction ${instruction.toString()}: . Please generate a new set of instructions to continue.`;
			try {
				const apiResponse = await queryChatGPT(prompt);
				console.log(`New instructions from the API:`, apiResponse);

				// Parse the new instructions and call executeInstructions recursively
				const newInstructions = JSON.parse(apiResponse).instructions;
				await executeInstructions(newInstructions);
			} catch (apiError) {
				console.error(`Error fetching new instructions from the API:`, apiError);
			}
		}
		}
	}
}
