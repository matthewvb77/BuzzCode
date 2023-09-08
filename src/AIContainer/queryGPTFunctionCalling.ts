import * as vscode from "vscode";
import axios from "axios";
import { AxiosError } from "axios";
import {
	contextLengthGpt3Point5,
	contextLengthGpt4,
} from "../settings/configuration";

export async function queryGPTFunctionCalling(
	functions: Array<any>,
	prompt: string,
	signal: AbortSignal
): Promise<string> {
	/* ----------------- Get Configuration --------------- */
	const openaiApiKey = vscode.workspace
		.getConfiguration("buzzcode")
		.get("openaiApiKey");

	const model = vscode.workspace.getConfiguration("buzzcode").get("model");
	const temperature = vscode.workspace
		.getConfiguration("buzzcode")
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
	const maxTokens = Math.round(
		(contextLength - prompt.length / charsPerToken) * (1 - marginOfError)
	);

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
			"Please set the API key in BuzzCode settings."
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
			if ((error as AxiosError).response) {
				// The error is an AxiosError
				const axiosError = error as AxiosError;
				const statusCode = axiosError.response?.status;
				const statusText = axiosError.response?.statusText;
				if (statusCode === 401) {
					return `Error: HTTP 401 - ${statusText} (Likely cause: Invalid API key)`;
				} else if (statusCode === 429) {
					return `Error: HTTP 429 - ${statusText} (Likely cause: OpenAI rate limit exceeded or no remaining funds)`;
				} else if (statusCode === 404) {
					//TODO: Replace this by disabling the gpt4 model when they dont have access
					return `Error: HTTP 404 - ${statusText} (Likely cause: You do not have access to GPT-4 api -- join the waitlist at https://openai.com/waitlist/gpt-4-api)`;
				} else {
					return "Error: " + error;
				}
			} else {
				return "Error: " + error;
			}
		}
	}
}
