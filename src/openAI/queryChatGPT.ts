import * as vscode from "vscode";
import { Configuration, OpenAIApi } from "openai";

export async function queryChatGPT(prompt: string): Promise<string | null> {
	/* ----------------- Get Configuration --------------- */
	const apiKey: string =
		vscode.workspace.getConfiguration("testwise").get("apiKey") || "";
	const configuration = new Configuration({
		apiKey: apiKey,
	});
	const openai = new OpenAIApi(configuration);
	const model: string =
		vscode.workspace.getConfiguration("testwise").get("model") ||
		"gpt-3.5-turbo";
	const temperature: number =
		vscode.workspace.getConfiguration("testwise").get("temperature") || 0.2;
	const maxTokens: number =
		vscode.workspace.getConfiguration("testwise").get("maxTokens") || 100;

	if (apiKey === "") {
		vscode.window.showErrorMessage(
			"Please set the API key in TestWise settings."
		);
		return null;
	}

	/* -------------- Query OpenAI ------------------ */
	try {
		const response = await openai.createCompletion({
			model: model,
			prompt: prompt,
			temperature: temperature,
			max_tokens: maxTokens,
		});

		if (response && response.status === 200 && response.data.choices[0].text) {
			return response.data.choices[0].text;
		} else {
			console.log(`error: ${response.statusText}`);
			return null;
		}
	} catch (error) {
		console.error(`Error fetching function from response:`, error);
		return null;
	}
}
