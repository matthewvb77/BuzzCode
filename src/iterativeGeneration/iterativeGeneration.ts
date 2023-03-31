import * as vscode from "vscode";
import { queryChatGPT } from "../openAI/queryChatGPT";
import { generateFile } from "./generateFile";

export async function iterativeGeneration(input: string, inputType: string) {
	/* ----------------------------- Generate function file ------------------------------- */
	let functionFileContents: string | null = null;

	if (inputType === "description") {
		const prompt = `Generate function described as follows:\n\n${input}\n\nFunction:`;
		functionFileContents = await queryChatGPT(prompt);
	} else if (inputType === "test") {
		functionFileContents = input;
	} else {
		throw new Error("Invalid input type");
	}

	// TODO: get file name from the user
	generateFile(functionFileContents, "function.py");

	/* ----------------------------- Generate test file ------------------------------- */
	const testPrompt = `Generate test file contents for function:\n\n${functionFileContents}\n\nTest File Contents:`;
	const testFileContents = await queryChatGPT(testPrompt);

	await generateFile(testFileContents, "function.test.py");

	/* -------- iterate: test -> alter function if needed -> repeat ------- */
	await iterate();
}

async function iterate() {
	// TODO: run tests

	const shellExecution = new vscode.ShellExecution(
		"python -m unittest function.test"
	);

	const task = new vscode.Task(
		{ type: "test" },
		vscode.TaskScope.Workspace,
		"Run tests",
		"python",
		shellExecution
	);

	await vscode.tasks.executeTask(task);

	// TODO: if tests fail, alter function

	// TODO: if tests pass, stop, otherwise, repeat
}
