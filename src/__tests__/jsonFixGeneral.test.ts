import { correctJson } from "../helpers/jsonFixGeneral"; // Replace with your actual module path.

describe("JSON Correction", () => {
	it("should not modify valid JSON", () => {
		const validJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(validJson);
		expect(result).toBe(validJson);
	});
	it("should fix bad escaped characters", () => {
		const invalidJson = `{"name":"Jo\\hn"}`;
		const expectedJson = `{"name":"John"}`;
		const result = correctJson(invalidJson);
		expect(result).toBe(expectedJson);
	});
	it("should balance braces", () => {
		const unbalancedJson = '{"name":"John", "age":30, "city":"New York"';
		const expectedJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(unbalancedJson);
		expect(result).toBe(expectedJson);
	});
	it("should add quotes to property names", () => {
		const invalidJson = '{name:"John", age:30, city:"New York"}';
		const expectedJson = '{"name":"John", "age":30, "city":"New York"}';
		const result = correctJson(invalidJson);
		expect(result).toBe(expectedJson);
	});
});
