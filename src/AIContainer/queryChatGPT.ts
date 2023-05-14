import * as vscode from "vscode";
import axios from "axios";
import {
	contextLengthGpt3Point5,
	contextLengthGpt4,
} from "../settings/configuration";

export async function queryChatGPT(
	prompt: string,
	signal: AbortSignal
): Promise<string> {
	/* ----------------- Get Configuration --------------- */
	const openaiApiKey = vscode.workspace
		.getConfiguration("testwise")
		.get("openaiApiKey");

	const model = vscode.workspace.getConfiguration("testwise").get("model");
	const temperature = vscode.workspace
		.getConfiguration("testwise")
		.get("temperature");

	let contextLength: number | undefined;

	// "The token count of your prompt plus max_tokens cannot exceed the model’s context length."
	switch (model) {
		case "gpt-3.5-turbo":
			contextLength = contextLengthGpt3Point5;
			break;

		case "gpt-4":
			contextLength = contextLengthGpt4;
			break;

		default:
			throw Error("Invalid model: " + model);
	}

	const charsPerToken = 4;
	const marginOfError = 0.2;
	const maxTokens =
		(contextLength - prompt.length / charsPerToken) * (1 - marginOfError);

	if (
		openaiApiKey === undefined ||
		model === undefined ||
		temperature === undefined ||
		maxTokens === undefined
	) {
		return "Error: Undefined configuration value";
	}

	if (openaiApiKey === "") {
		vscode.window.showErrorMessage(
			"Please set the API key in TestWise settings."
		);
		return "Error: No API key";
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
					Authorization: `Bearer ${openaiApiKey}`,
				},
				cancelToken: new axios.CancelToken((c) =>
					signal.addEventListener("abort", () => c("Request cancelled"))
				),
			}
		);

		if (response.status === 200 && response.data.choices[0].message) {
			return response.data.choices[0].message.content;
		} else {
			return "Error: " + response.statusText;
		}
	} catch (error) {
		if (axios.isCancel(error)) {
			return "Cancelled";
		} else {
			return "Error: " + error;
		}
	}
}
