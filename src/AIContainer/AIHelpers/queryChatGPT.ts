import * as vscode from "vscode";
import axios from "axios";

export async function queryChatGPT(
	prompt: string,
	signal: AbortSignal
): Promise<string> {
	/* ----------------- Get Configuration --------------- */
	const apiKey = vscode.workspace.getConfiguration("testwise").get("apiKey");

	const model = vscode.workspace.getConfiguration("testwise").get("model");
	const temperature = vscode.workspace
		.getConfiguration("testwise")
		.get("temperature");
	const maxTokens = vscode.workspace
		.getConfiguration("testwise")
		.get("maxTokens");

	if (
		apiKey === undefined ||
		model === undefined ||
		temperature === undefined ||
		maxTokens === undefined
	) {
		vscode.window.showErrorMessage(
			"Configuration value is undefined. This should not happen."
		);
		return "Error";
	}

	if (apiKey === "") {
		vscode.window.showErrorMessage(
			"Please set the API key in TestWise settings."
		);
		return "Error";
	}

	/* -------------- Query OpenAI using Axios ------------------ */
	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
			{
				model: model,
				messages: [{ role: "user", content: prompt }],
				temperature: temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				cancelToken: new axios.CancelToken((c) =>
					signal.addEventListener("abort", () => c("Request cancelled"))
				),
			}
		);

		if (response.status === 200 && response.data.choices[0].message) {
			return response.data.choices[0].message.content;
		} else {
			console.log(`error: ${response.statusText}`);
			return "Error";
		}
	} catch (error) {
		if (axios.isCancel(error)) {
			return "Cancelled";
		} else {
			return "Error";
		}
	}
}
