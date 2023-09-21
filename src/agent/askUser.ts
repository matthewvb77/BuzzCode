import * as vscode from "vscode";

export async function askUser(question: string) {
	return new Promise(async (resolve, reject) => {
		const userResponse = await vscode.window.showInputBox({
			placeHolder: "Answer here...",
			prompt: question,
		});
		if (userResponse) {
			resolve(userResponse);
		} else {
			reject(new Error("No user response provided."));
		}
	});
}
