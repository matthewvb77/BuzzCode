// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "testwise" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(
		"testwise.helloWorld",
		() => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage(
				"Hello World from TestWise! -- TESTING"
			);
		}
	);

	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.commands.registerCommand("testwise.askQuestion", async () => {
			const answer = await vscode.window.showInformationMessage(
				"How was your day?",
				"Good",
				"Bad"
			);
			if (answer === "Bad") {
				vscode.window.showInformationMessage("Sorry to hear that");
			} else {
				console.log({ answer });
			}
		})
	);

	// function that pushes a new command where you can query openai api
	context.subscriptions.push(
		vscode.commands.registerCommand("testwise.askOpenAI", async () => {
			const input = await vscode.window.showInputBox({
				prompt: "Ask code-davinci-003 a question",
				placeHolder: "put question here",
			});

			if (input) {
				// configuring openai -------------------------------------------------- test
				dotenv.config({ path: "C:\\Users\\vbmat\\Projects\\testwise\\.env" });

				const configuration = new Configuration({
					apiKey: process.env.OPENAI_API_KEY,
				});
				const openai = new OpenAIApi(configuration);
				const modelName = "text-davinci-003";
				const response = await openai.createCompletion({
					model: modelName,
					prompt: input,
					temperature: 0.2,
					max_tokens: 10,
				});
				// configuring openai -------------------------------------------------- test
				if (response && response.status === 200) {
					console.log(response); //.data.choices[0].text)
					vscode.window.showInformationMessage(
						`${modelName} has answered: ${response.data.choices[0].text}`
					);
				} else {
					console.log(`error: ${response.statusText}`);
				}
			}
		})
	);
}

function generatePrompt(input: string) {
	// very inefficient, just for testing
	return `Answer this: ${input}`;
}

async function configureOpenAI() {}

// This method is called when your extension is deactivated
export function deactivate() {}
