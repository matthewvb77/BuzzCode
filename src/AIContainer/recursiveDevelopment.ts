import * as vscode from "vscode";
import { queryChatGPT } from "./AIHelpers/queryChatGPT";
import { executeTerminalCommand } from "./AIHelpers/executeTerminalCommand";
import { askUser } from "./AIHelpers/askUser";
import { generateFile } from "./AIHelpers/generateFile";
import { initializePrompt, taskPrompt } from "./prompts";

export interface Instruction {
	index: number;
	type: string;
	parameters: any;
}

var recursionLimit = 10;
var recursionCount = 0;
var taskDescription = "";
export async function recursiveDevelopment(
	input: string,
	updateProgressBar: (progress: number, subtask: string) => void,
	onInstructionsReady: (
		instructions: Array<Instruction>
	) => Promise<void | string>
): Promise<void | "Cancelled"> {
	taskDescription = input; // Saves original task description
	recursionCount = 0;
	return await recursiveDevelopmentHelper(
		taskDescription,
		updateProgressBar,
		onInstructionsReady
	);
}

async function recursiveDevelopmentHelper(
	input: string,
	updateProgressBar: (progress: number, subtask: string) => void,
	onInstructionsReady: (
		instructions: Array<Instruction>
	) => Promise<void | string>
): Promise<void | "Cancelled"> {
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

	const userAction = await onInstructionsReady(instructions);
	switch (userAction) {
		case "confirm":
			break;

		case "regenerate":
			return await recursiveDevelopmentHelper(
				input,
				updateProgressBar,
				onInstructionsReady
			);

		case "cancel":
			return "Cancelled";

		default:
			throw new Error("Invalid user action");
	}

	for (const [index, instruction] of instructions.entries()) {
		const { type, parameters } = instruction;
		const progress = ((index + 1) / (instructions.length + 1)) * 100; // +1 is to include the subtask generation
		updateProgressBar(progress, getDescription(instruction));

		try {
			switch (type) {
				case "executeTerminalCommand":
					const { command } = parameters;
					const result = await executeTerminalCommand(command);
					if (typeof result === "string") {
						return "Cancelled";
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
							`\n\nThis is a recursive call with the following prompt: ` +
							newPrompt,
						updateProgressBar,
						onInstructionsReady
					);
					break;

				case "askUser":
					const { question } = parameters;
					const userResponse = await askUser(question);
					await recursiveDevelopmentHelper(
						`Here is the original task: ` +
							taskDescription +
							`\n\nThis is a recursive call because askUser(${question}) was called. Here is the user's response: ` +
							userResponse,
						updateProgressBar,
						onInstructionsReady
					);
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
					`\n\nThink about why this error occured and how to fix it.`,
				updateProgressBar,
				onInstructionsReady
			);
		}
	}
}

function getDescription(instruction: Instruction) {
	const { type, parameters } = instruction;
	switch (type) {
		case "executeTerminalCommand":
			return `Executing terminal command...`;
		case "generateFile":
			return `Generating file: ${parameters.fileName}`;
		case "recurse":
			return `Recursing with new prompt...`;
		case "askUser":
			return `Asking user for input...`;
		default:
			return `Unknown instruction type "${type}"`;
	}
}
