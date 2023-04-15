import * as vscode from "vscode";
import axios from "axios";

export async function queryChatGPT(
	prompt: string,
	signal: AbortSignal
): Promise<string | null> {
	/* ----------------- Get Configuration --------------- */
	const apiKey: string =
		vscode.workspace.getConfiguration("testwise").get("apiKey") || "";

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
			return null;
		}
	} catch (error) {
		if (axios.isCancel(error)) {
			console.log("Request cancelled:", error.message);
		} else {
			console.error(`Error fetching function from response:`, error);
		}
		return null;
	}
}
