import * as vscode from "vscode";
export async function generateFile(contents: string | null, fileName: string) {
	/* ------------------------------- Validate Input --------------------------------- */
	if (!contents) {
		vscode.window.showErrorMessage("No contents provided.");
		return;
	}
	/* ----------------------------- Get Current Folder ------------------------------- */
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace folder is open.");
		return;
	}

	const workspaceFolder = workspaceFolders[0].uri;

	/* ----------------------------- Create File ------------------------------- */

	const newFileUri = vscode.Uri.joinPath(workspaceFolder, fileName);

	const fileContent = "This is the content of the new file.";
	await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(fileContent));
}
