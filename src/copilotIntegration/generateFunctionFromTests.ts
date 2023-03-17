import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

// --------------------- temp config ----------------------------------
dotenv.config({ path: "C:\\Users\\vbmat\\Projects\\testwise\\.env" });
const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const modelName = "text-davinci-003";
const temperature = 0.2;
const maxTokens = 10;
// ------------------- temp config (end) ---------------------------------

async function fetchFunctionFromOpenAI(input: string): Promise<string | null> {
	try {
		if (input) {
			dotenv.config({ path: "C:\\Users\\vbmat\\Projects\\testwise\\.env" }); // TODO: remove when 'settings' is implemented

			const response = await openai.createCompletion({
				model: modelName,
				prompt: input,
				temperature: temperature,
				max_tokens: maxTokens,
			});

			if (response && response.status === 200) {
				console.log(response); // TODO: remove (debugging)
				return response.data.choices[0].text!; // TODO: ! is not safe
			} else {
				console.log(`error: ${response.statusText}`);
				return null;
			}
		} else {
			return null;
		}
	} catch (error) {
		console.error(`Error fetching function from response:`, error);
		return null;
	}
}

export async function generateFunctionFromTests(
	testCode: string
): Promise<string | null> {
	if (!process.env.apiKey) {
		vscode.window.showErrorMessage(
			"Please set the API key in TestWise settings."
		);
		return null;
	}

	const prompt = generatePrompt(testCode);

	const generatedFunction = await fetchFunctionFromOpenAI(prompt);
	return generatedFunction;
}

function generatePrompt(input: string) {
	// TODO: replace with proper prompting file
	return `Generate a function that passes the following test suite:\n\n${input}\n\nFunction:`;
}
