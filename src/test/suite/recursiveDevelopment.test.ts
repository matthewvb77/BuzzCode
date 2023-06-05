import * as vscode from "vscode";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as nock from "nock";
import { recursiveDevelopment } from "../../AIContainer/recursiveDevelopment";
import { TerminalObject } from "../../objects/terminalObject";

// chai.use(chaiAsPromised);
// const expect = chai.expect;

// describe("recursiveDevelopment function", function () {
// 	let sandbox: sinon.SinonSandbox;

// 	beforeEach(function () {
// 		sandbox = sinon.createSandbox();
// 	});

// 	afterEach(function () {
// 		sandbox.restore();
// 	});

// 	it("should resolve with a string if there is an error during terminal creation", async function () {
// 		const signal: AbortSignal = new AbortController().signal;
// 		sandbox.stub(TerminalObject, "create").throws(new Error("Test error"));

// 		const result = await recursiveDevelopment(
// 			"",
// 			signal,
// 			sinon.fake(),
// 			sinon.fake(),
// 			sinon.fake()
// 		);

// 		expect(result).to.equal("Error: Test error");
// 	});

// 	// Add more tests for the different branches of your code here...
// });
