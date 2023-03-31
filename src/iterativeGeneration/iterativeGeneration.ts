import * as vscode from "vscode";
import { queryChatGPT } from "../openAI/queryChatGPT";
import { generateFile } from "./generateFile";

export async function iterativeGeneration(input: string, inputType: string) {
	/* ----------------------------- Generate function file ------------------------------- */
	let functionFileContents: string | null;

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
	let testsPassed = false;
	const maxIterations = 5;
	let iterations = 0;

	while (!testsPassed && iterations < maxIterations) {
		const testOutput = await runTests();

		if (!testOutput.toString().includes("FAIL")) {
			testsPassed = true;
		} else {
			// TODO: parse test output to get failure message (for token optimization)
			const failureMessage = testOutput.toString();
			await alterFunction(failureMessage);
		}
		iterations++;
	}

	if (testsPassed) {
		vscode.window.showInformationMessage("Tests passed!");
		// TODO: Show explanation of the function in the output panel
	} else {
		vscode.window.showErrorMessage("Tests failed. Max iterations reached.");
	}
}

async function runTests() {
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

	const result = await vscode.tasks.executeTask(task);
	return result;
}

async function alterFunction(failureMessage: string) {
	const functionFilePath = vscode.Uri.file("function.py");

	const functionFileContents = (
		await vscode.workspace.fs.readFile(functionFilePath)
	).toString();

	const prompt = `Alter function to fix test failure:\n\n${failureMessage}\n\nFunction:\n\n${functionFileContents}\n\nNew Function:`;
	const newFunctionFileContents = await queryChatGPT(prompt);

	if (newFunctionFileContents) {
		const textEncoder = new TextEncoder();
		await vscode.workspace.fs.writeFile(
			functionFilePath,
			textEncoder.encode(newFunctionFileContents)
		);
	} else {
		throw new Error("Failed to generate a new function.");
	}
}
