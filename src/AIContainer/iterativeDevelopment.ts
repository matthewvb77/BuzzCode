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

	/* ----------------------------- EXECUTE INSTRUCTIONS ------------------------------- */
	var instructionsString = await queryChatGPT(initialize + input);

	if (!instructionsString) {
		vscode.window.showErrorMessage("No instructions provided.");
		return;
	}

	var instructionsJSON = JSON.parse(instructionsString);

	for (const instruction of instructionsJSON) {
		const { type, parameters } = instruction;

		switch (type) {
			case "executeCommand":
				const { command } = parameters;
				try {
					const result = await executeCommand(command);
					console.log(`Command executed: ${command}\nResult:`, result);
				} catch (error) {
					console.error(`Error executing command "${command}":`, error);
				}
				break;

			case "generateFile":
				const { fileName, fileContents } = parameters;
				try {
					await generateFile(fileName, fileContents);
					console.log(`File generated: ${fileName}`);
				} catch (error) {
					console.error(`Error generating file "${fileName}":`, error);
				}
				break;

			case "query":
				const { prompt } = parameters;
				try {
					const response = await queryChatGPT(prompt);
					console.log(`Query response:`, response);
				} catch (error) {
					console.error(`Error querying prompt "${prompt}":`, error);
				}
				break;

			default:
				console.warn(`Unknown instruction type "${type}"`);
		}
	}
}
