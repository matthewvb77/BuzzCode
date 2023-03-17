// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { generateFunctionFromTests } from "./copilotIntegration/generateFunctionFromTests";

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

	// function that pushes a new command where you can query openai api
	context.subscriptions.push(
		vscode.commands.registerCommand("testwise.codeForMe", async () => {
			// Get user's active vscode window
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("No active text editor found.");
				return;
			}

			// Get function from test suite
			const testSuites = editor.document.getText();
			const generatedFunction = await generateFunctionFromTests(testSuites);

			if (!generatedFunction) {
				vscode.window.showErrorMessage(
					"Failed to generate a function from the test suites."
				);
				return;
			}

			// auto-inject the function		TODO: review, maybe do this with a changelist
			editor.edit((editBuilder) => {
				const position = editor.selection.active;
				editBuilder.insert(position, generatedFunction);
				// editBuilder.insert(position, "\n\n --------- DONE! -------");
			});
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
