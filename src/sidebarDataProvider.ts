import * as vscode from "vscode";

export class SidebarDataProvider
	implements vscode.TreeDataProvider<vscode.TreeItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<
		vscode.TreeItem | undefined | null | void
	> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		vscode.TreeItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		return Promise.resolve([this.createForm()]);
	}

	private createForm(): vscode.TreeItem {
		const formItem = new vscode.TreeItem(
			"Enter a prompt and press 'Generate Code'",
			vscode.TreeItemCollapsibleState.None
		);
		formItem.tooltip = "Click here to generate code from a prompt";
		formItem.command = {
			command: "testwise.showInputBox",
			title: "Generate Code",
		};
		return formItem;
	}
}
