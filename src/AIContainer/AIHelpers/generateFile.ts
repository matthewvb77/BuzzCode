import * as vscode from "vscode";
export async function generateFile(
	fileName: string | null,
	contents: string | null
) {
	/* ------------------------------- Validate Input --------------------------------- */
	if (!contents || !fileName) {
		vscode.window.showErrorMessage("No contents or fileName provided.");
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

	// Check if file exists
	try {
		await vscode.workspace.fs.stat(newFileUri);
		// If stat is successful, the file exists
		const overwrite = await vscode.window.showWarningMessage(
			`File '${fileName}' already exists. Do you want to overwrite it?`,
			{ modal: true },
			"Yes"
		);

		if (overwrite !== "Yes") {
			// User chose not to overwrite the file
			return;
		}
	} catch (error) {
		// An error occurred other than FileNotFound
		vscode.window.showErrorMessage(
			`An error occurred: ${(error as Error).message}`
		);
		return;
	}

	await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(contents));
}
