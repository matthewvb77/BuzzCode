import { expect } from "chai";
import { describe, it } from "mocha";
import { validateJSON, AgentPhase } from "../../agent/recursiveDevelopment";
import { RETURN_CANCELLED, ERROR_PREFIX } from "../../settings/configuration";

// Mocking correctJson just for the sake of testing
function correctJson(json: string): string {
	return json; // A simple mock that returns the input as it is
}

describe("validateJSON function", () => {
	it("should return the response directly if it equals RETURN_CANCELLED", () => {
		const result = validateJSON(RETURN_CANCELLED, AgentPhase.planning);
		expect(result).to.equal(RETURN_CANCELLED);
	});

	it("should return parsed JSON if the response contains valid JSON", () => {
		const json = '["valid", "json", "array"]';
		const result = validateJSON(json, AgentPhase.planning);
		expect(result).to.deep.equal(["valid", "json", "array"]);
	});

	it("should return error if no JSON is found", () => {
		const response = "This is a plain string without JSON";
		const result = validateJSON(response, AgentPhase.planning);
		expect(result).to.equal(ERROR_PREFIX + "Invalid JSON. \nNo JSON found.");
	});

	it("should return error if the JSON is invalid", () => {
		const json = "[invalid, json, array]";
		const result = validateJSON(json, AgentPhase.planning);
		expect(result.startsWith(ERROR_PREFIX)).to.be.true;
	});
});
