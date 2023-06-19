import {
	TerminalObject,
	parseErrorMessage,
	containsError,
} from "../../objects/terminalObject";
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
		const timeout = 5000;
		let start = 0;
		while (vscode.workspace.workspaceFolders === undefined && start < timeout) {
			start += 100;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		terminalObject = await TerminalObject.create(abortController.signal);
	});

	after(() => {
		// Delete test.txt file if it exists
		const fileName = path.join(process.cwd(), "test.txt");
		if (fs.existsSync(fileName)) {
			fs.unlinkSync(fileName);
		}

		// Clean up other resources
		terminalObject.dispose();
		fs.rmSync(testWorkspaceDir, { recursive: true });
	});

	it("executeCommand should execute a command", async function () {
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

	it("generateFile should create a new file with correct contents", async function () {
		const fileName = path.join(process.cwd(), "test.txt");
		const fileContents = "Hello, World!";

		const generateResult = await terminalObject.generateFile(
			fileName,
			fileContents,
			0,
			false
		);
		if (typeof generateResult !== "string") {
			expect(generateResult.error).to.equal("");

			// Check the file creation and content by reading the file
			const createdFileContent = fs.readFileSync(fileName, "utf-8");
			expect(createdFileContent).to.equal(fileContents);
		} else {
			throw new Error("File generation was cancelled unexpectedly.");
		}
	});

	// Test helper functions: parseErrorMessage, containsError
	describe("containsError", () => {
		it("should return true when error messages are present", () => {
			const testMessage = "A fatal error occurred: not found";
			const result = containsError(testMessage);
			expect(result).to.be.true;
		});

		it("should return false when no error messages are present", () => {
			const testMessage = "Operation was successful";
			const result = containsError(testMessage);
			expect(result).to.be.false;
		});
	});
	// TODO: parseErrorMessage was ineffective and has been removed, replace once function is fixed
	// describe("parseErrorMessage", () => {
	// 	it("should extract the error message from the string", () => {
	// 		const testErrorString =
	// 			"Some text here\n\r\n\rError message\n\rSome other text";
	// 		const result = parseErrorMessage(testErrorString);
	// 		expect(result).to.equal("Error message");
	// 	});

	// 	it("should return the entire string if no error message is found", () => {
	// 		const testErrorString = "Some text here without error format";
	// 		const result = parseErrorMessage(testErrorString);
	// 		expect(result).to.equal(testErrorString);
	// 	});
	// });
});
