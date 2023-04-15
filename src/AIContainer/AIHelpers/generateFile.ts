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

	const overwrite = await vscode.window.showWarningMessage(
		`This action might overwrite an existing file '${fileName}'. Do you want to proceed?`,
		{ modal: true },
		"Yes"
	);

	if (overwrite !== "Yes") {
		// User chose not to proceed
		return "Cancelled";
	}

	await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(contents));
}
