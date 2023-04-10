import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeTerminalCommand } from "./AIHelpers/executeTerminalCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { initializePrompt, taskPrompt } from "./prompts";

interface Instruction {
	index: number;
	type: string;
	parameters: any;
}

var recursionLimit = 10;
var recursionCount = 0;
var taskDescription = "";
export async function recursiveDevelopment(input: string) {
	taskDescription = input; // Saves original task description
	recursionCount = 0;
	recursiveDevelopmentHelper(taskDescription);
}

async function recursiveDevelopmentHelper(input: string) {
	try {
		recursionCount++;
		if (recursionCount >= recursionLimit) {
			vscode.window.showErrorMessage("Recursion limit reached.");
			return;
		}

		var instructionsString: string | null = await queryChatGPT(
			initializePrompt + taskPrompt + input
		);

		if (instructionsString === null) {
			vscode.window.showErrorMessage("No instructions provided.");
			return;
		}

		var instructions: Array<Instruction> =
			JSON.parse(instructionsString).instructions;
	} catch (error) {
		vscode.window.showErrorMessage("Error occured: " + error);
		return;
	}

	for (const instruction of instructions) {
		const { type, parameters } = instruction;

		try {
			switch (type) {
				case "executeTerminalCommand":
					const { command } = parameters;
					const result = await executeTerminalCommand(command);
					if (typeof result === "string") {
						vscode.window.showInformationMessage(
							"User cancelled execution -- Terminating Process."
						);
						return;
					} else if (result.error) {
						throw result.error;
					}
					break;

				case "generateFile":
					const { fileName, fileContents } = parameters;
					await generateFile(fileName, fileContents);
					break;

				case "recurse":
					const { newPrompt } = parameters;
					await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive with the following prompt: ` +
							newPrompt
					);
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

			await recursiveDevelopmentHelper(
				`Here is the original task: ` +
					taskDescription +
					`\n\nThis is a recursive call because while this instruction was executed:` +
					JSON.stringify(instruction) +
					`\nThe following error occured:\n\n` +
					error +
					`\n\nThink about why this error occured and how to fix it.`
			);
		}
	}
}
