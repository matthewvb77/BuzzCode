import * as assert from "assert";
import { TerminalObject, CommandResult } from "../objects/terminalObject";

describe("TerminalObject", () => {
	let abortController: AbortController;
	let terminalObject: TerminalObject;

	beforeEach(async () => {
		abortController = new AbortController();
		terminalObject = await TerminalObject.create(abortController.signal);
	});

	afterEach(() => {
		terminalObject.dispose();
	});

	describe("#create()", () => {
		it("should correctly create a TerminalObject instance", () => {
			assert(terminalObject instanceof TerminalObject);
		});
	});

	describe("#executeCommand()", () => {
		it("should correctly execute command and return the result", async () => {
			const result = await terminalObject.executeCommand("echo test", 1, false);
			assert.strictEqual((result as CommandResult).stdout, "test");
		});

		it('should return "Cancelled" if signal aborted', async () => {
			abortController.abort();
			const result = await terminalObject.executeCommand("echo test", 1, false);
			assert.strictEqual(result, "Cancelled");
		});
	});

	describe("#generateFile()", () => {
		it("should correctly generate a file and return the result", async () => {
			const fileName = "testFile.txt";
			const fileContents = "Test content";
			const result = await terminalObject.generateFile(
				fileName,
				fileContents,
				1
			);
			assert.strictEqual(
				(result as CommandResult).stdout.includes(fileName),
				true
			);
			// Further checks should verify the file has been created and has the correct contents
		});
	});

	describe("#dispose()", () => {
		it("should correctly dispose of terminal resources", () => {
			terminalObject.dispose();
			assert.strictEqual(terminalObject.readOnly, true);
		});
	});
});
