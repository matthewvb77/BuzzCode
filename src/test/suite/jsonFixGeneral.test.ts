import { expect } from "chai";
import { correctJson } from "../../helpers/jsonFixGeneral";
import { describe, it } from "mocha";

describe("JSON Correction", () => {
	it("should not modify valid JSON", () => {
		const validJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(validJson);
		expect(result).to.equal(validJson);
	});
	it("should fix bad escaped characters", () => {
		const invalidJson = `{"name":"Jo\\hn"}`;
		const expectedJson = `{"name":"John"}`;
		const result = correctJson(invalidJson);
		expect(result).to.equal(expectedJson);
	});
	it("should balance braces", () => {
		const unbalancedJson = '{"name":"John", "age":30, "city":"New York"';
		const expectedJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(unbalancedJson);
		expect(result).to.equal(expectedJson);
	});
	it("should add quotes to property names", () => {
		const invalidJson = '{name:"John", age:30, city:"New York"}';
		const expectedJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(invalidJson);
		expect(result).to.equal(expectedJson);
	});
});
