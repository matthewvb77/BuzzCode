import { TerminalObject } from "../../objects/terminalObject";
import { expect } from "chai";
import * as fs from "fs";
import "mocha";

describe("TerminalObject Integration Tests", () => {
	let terminalObject: TerminalObject;
	const abortController = new AbortController();

	before(async () => {
		terminalObject = await TerminalObject.create(abortController.signal);
	});

	after(() => {
		terminalObject.dispose();
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

	it("generateFile should create a new file with correct contents", async () => {
		const fileName = "test.txt";
		const fileContents = "Hello, World!";

		const generateResult = await terminalObject.generateFile(
			fileName,
			fileContents,
			0
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
});
