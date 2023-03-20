import * as vscode from "vscode";
import { Configuration, OpenAIApi } from "openai";

export async function generateFunctionFromTests(
	testCode: string
): Promise<string | null> {
	// --------------------- temp config ----------------------------------
	const apiKey: string =
		vscode.workspace.getConfiguration("testwise").get("apiKey") || "";
	const configuration = new Configuration({
		apiKey: apiKey,
	});
	const openai = new OpenAIApi(configuration);
	const modelName = "text-davinci-003"; // TODO: add this to settings
	const temperature = vscode.workspace
		.getConfiguration("testwise")
		.get("temperature");
	const maxTokens = vscode.workspace
		.getConfiguration("testwise")
		.get("maxTokens");

	if (apiKey === "") {
		vscode.window.showErrorMessage(
			"Please set the API key in TestWise settings."
		);
		return null;
	}

	const prompt = generatePrompt(testCode);

	/* -------------- Query OpenAI ------------------ */
	try {
		const response = await openai.createCompletion({
			model: modelName,
			prompt: prompt,
			temperature: temperature,
			max_tokens: maxTokens,
		});

		if (response && response.status === 200) {
			return response.data.choices[0].text!; // TODO: ! is not safe
		} else {
			console.log(`error: ${response.statusText}`);
			return null;
		}
	} catch (error) {
		console.error(`Error fetching function from response:`, error);
		return null;
	}
}

function generatePrompt(input: string) {
	// TODO: replace with proper prompting file
	return `Generate a function that passes the following test suite:\n\n${input}\n\nFunction:`;
}
