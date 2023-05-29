import { TerminalObject } from "../../objects/terminalObject";
import { expect } from "chai";
import "mocha";
import { describe, it, before, after } from "mocha";
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";

describe("TerminalObject Integration Tests", () => {
	let terminalObject: TerminalObject;
	const abortController = new AbortController();

	const testWorkspaceDir = path.join(os.tmpdir(), "vscode-test-workspace");

	before(async () => {
		if (!fs.existsSync(testWorkspaceDir)) {
			fs.mkdirSync(testWorkspaceDir);
		}

		// Open the new workspace directory
		await vscode.commands.executeCommand(
			"vscode.openFolder",
			vscode.Uri.file(testWorkspaceDir),
			false
		);

		await new Promise((resolve) => setTimeout(resolve, 1000));
		terminalObject = await TerminalObject.create(abortController.signal);
	});

	after(() => {
		terminalObject.dispose();
		fs.rmSync(testWorkspaceDir, { recursive: true });
	});

	it("executeCommand should execute a command", async () => {
		const commandResult = await terminalObject.executeCommand(
			"echo hello",
			0,
			false
		);

		if (typeof commandResult !== "string") {
			expect(commandResult.error).to.equal("");
			expect(commandResult.stdout).to.contain("hello");
			expect(commandResult.stderr).to.equal("");
		} else {
			throw new Error("Command was cancelled unexpectedly.");
		}
	});

	// Uncomment the test when ready
	// it("generateFile should create a new file with correct contents", async () => {
	// 	const fileName = "test.txt";
	// 	const fileContents = "Hello, World!";

	// 	const generateResult = await terminalObject.generateFile(
	// 		fileName,
	// 		fileContents,
	// 		0
	// 	);

	// 	if (typeof generateResult !== "string") {
	// 		expect(generateResult.error).to.equal("");

	// 		// Check the file creation and content by reading the file
	// 		const createdFileContent = fs.readFileSync(fileName, "utf-8");
	// 		expect(createdFileContent).to.equal(fileContents);
	// 	} else {
	// 		throw new Error("File generation was cancelled unexpectedly.");
	// 	}
	// });
});
