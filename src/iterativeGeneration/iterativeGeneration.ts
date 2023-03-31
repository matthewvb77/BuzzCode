import * as vscode from "vscode";
import { queryChatGPT } from "../openAI/queryChatGPT";
import { generateFile } from "./generateFile";
import { hasValidAPIKey } from "../helpers/hasValidAPIKey";
import { runTests } from "../helpers/runTests";

export async function iterativeGeneration(input: string, inputType: string) {
	if (!hasValidAPIKey()) {
		vscode.window.showErrorMessage("No valid API key found.");
		return;
	}

	/* ----------------------------- Generate function file ------------------------------- */
	let functionFileContents: string | null;
	let functionFileName: string | null;

	if (inputType === "description") {
		const prompt = `Generate function described as follows:\n\n${input}\n\nFunction:`;
		functionFileContents = await queryChatGPT(prompt);
	} else if (inputType === "test") {
		functionFileContents = input;
	} else {
		throw new Error("Invalid input type");
	}

	functionFileName = await queryChatGPT(
		"Generate file name for this function:\n\n" +
			functionFileContents +
			"\n\nFile Name:"
	);

	await generateFile(functionFileName, functionFileContents);

	/* ----------------------------- Generate test file ------------------------------- */
	const testPrompt =
		`Generate a runnable test suite for the following ` +
		functionFileName +
		`. Import the function we're testing and the test tool:\n\n${functionFileContents}\n\nTest Suite:'`;
	const testFileContents = await queryChatGPT(testPrompt);
	const testFileName = await queryChatGPT(
		"Generate file name for this test suite:\n\n" +
			testFileContents +
			"\n\nFile Name:"
	);

	await generateFile(testFileName, testFileContents);

	/* -------- iterate: test -> alter function if needed -> repeat ------- */
	let testsPassed = false;
	const maxIterations = 5;
	let iterations = 0;

	while (!testsPassed && iterations < maxIterations) {
		const testOutput = await runTests(testFileName);

		if (
			!testOutput.toString().includes("FAIL") &&
			!testOutput.toString().includes("ERROR") &&
			testOutput.toString().includes("OK")
		) {
			testsPassed = true;
		} else {
			// TODO: parse test output to get failure message (for token optimization)
			const failureMessage = testOutput.toString();
			await alterFunction(functionFileName, failureMessage);
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

async function alterFunction(fileName: string | null, failureMessage: string) {
	if (!fileName) {
		throw new Error("No file name provided.");
	}
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		throw new Error("No workspace folder found.");
	}
	const functionFilePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

	const functionFileContents = (
		await vscode.workspace.fs.readFile(functionFilePath)
	).toString();

	const prompt = `Alter function to fix test failure:\n\n${failureMessage}\n\nFunction:\n\n${functionFileContents}\n\nNew Function:`;
	const newFunctionFileContents = await queryChatGPT(prompt);

	if (newFunctionFileContents) {
		vscode.window.showInformationMessage("Altering function...");
		const textEncoder = new TextEncoder();
		await vscode.workspace.fs.writeFile(
			functionFilePath,
			textEncoder.encode(newFunctionFileContents)
		);
	} else {
		throw new Error("Failed to generate a new function.");
	}
}
