import * as vscode from "vscode";
import axios from "axios";
import { AxiosError } from "axios";
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
		.getConfiguration("buzzcode")
		.get("openaiApiKey");

	const model = vscode.workspace.getConfiguration("buzzcode").get("model");
	const temperature = vscode.workspace
		.getConfiguration("buzzcode")
		.get("temperature");

	if (
		openaiApiKey === undefined ||
		model === undefined ||
		temperature === undefined
	) {
		return "Error: Undefined configuration value";
	}

	if (openaiApiKey === "") {
		vscode.window.showErrorMessage(
			"Please set the API key in BuzzCode settings."
		);
		return "Error: No API key";
	}

	if (model !== "gpt-4" && model !== "gpt-3.5-turbo") {
		throw new Error("Invalid model");
	}

	const modelName =
		model === "gpt-4" ? "gpt-4-1106-preview" : "gpt-3.5-turbo-1106";

	/* -------------- Query OpenAI using Axios ------------------ */
	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
			{
				model: modelName,
				messages: [{ role: "user", content: prompt }],
				temperature: temperature,
				response_format: { type: "json_object" },
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
