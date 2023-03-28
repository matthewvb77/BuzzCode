import * as vscode from "vscode";

export class ChatboxTreeItem extends vscode.TreeItem {
	constructor(label: string) {
		super(label, vscode.TreeItemCollapsibleState.None);

		// Set the contextValue to differentiate this item from others in the tree
		this.contextValue = "chatboxTreeItem";
	}

	// You can add methods and properties specific to the chatbox item here
}
