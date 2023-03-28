import * as vscode from "vscode";
import { ChatboxTreeItem } from "./chatboxTreeItem";

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

	getChildren(element?: ChatboxTreeItem): Thenable<ChatboxTreeItem[]> {
		if (element) {
			return Promise.resolve([]);
		}
		const chatbox = this.createChatbox();
		return Promise.resolve([chatbox]);
	}

	private createChatbox(): vscode.TreeItem {
		const chatboxItem = new ChatboxTreeItem("TestWise Chatbox");
		chatboxItem.tooltip = "Enter your prompt here to generate code";
		return chatboxItem;
	}
}
