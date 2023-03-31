import * as cp from "child_process";
import * as vscode from "vscode";

export async function runTests(testFileName: string | null): Promise<string> {
	return new Promise(async (resolve, reject) => {
		if (!testFileName) {
			reject(new Error("No test file name provided."));
			throw new Error("No test file name provided.");
		}
		const testName = testFileName.split(".")[0];

		const outputChannel = vscode.window.createOutputChannel("Test Runner");
		outputChannel.clear();
		outputChannel.show();

		const testCommand = `python -m unittest ${testName}`;
		outputChannel.appendLine(`Running: ${testCommand}`);

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!workspaceFolder) {
			reject(new Error("No workspace folder found."));
		}

		const execOptions = {
			cwd: workspaceFolder,
		};

		const exec = cp.exec(testCommand, execOptions, (error, stdout, stderr) => {
			if (error) {
				outputChannel.appendLine(`Error: ${error.message}`);
			}
			if (stderr) {
				outputChannel.appendLine(`Error output: ${stderr}`);
			}
			if (stdout) {
				outputChannel.appendLine(`Output: ${stdout}`);
			}
			const combinedOutput = `error: ${error}\nstderr: ${stderr}\nstdout: ${stdout}`;
			resolve(combinedOutput);
		});
	});
}
