/*
MIT License

Copyright (c) 2023 Toran Bruce Richards

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
	I (Matthew Van Brummelen) HAVE MADE CHANGES TO THIS CODE.
*/

import { shell } from "../settings/configuration";

type JSONCorrectionResult = {
	json: string;
	error: Error | null;
};

function fixInvalidEscape(jsonToLoad: string, errorMessage: string): string {
	while (errorMessage.startsWith("Bad escaped character")) {
		const badEscapeLocation = extractCharPosition(errorMessage);
		jsonToLoad =
			jsonToLoad.slice(0, badEscapeLocation - 1) +
			jsonToLoad.slice(badEscapeLocation);

		try {
			JSON.parse(jsonToLoad);
			return jsonToLoad;
		} catch (error) {
			console.error("JSON parse error - fix invalid escape", error);
			errorMessage = (error as Error).message;
		}
	}
	return jsonToLoad;
}

function extractCharPosition(errorMessage: string): number {
	// Extract character position from error message
	const match = errorMessage.match(/position (\d+)/);
	if (match) {
		return parseInt(match[1]);
	}
	return -1;
}

function balanceBraces(jsonString: string): string | null {
	let openBracesCount = jsonString.split("{").length - 1;
	let closeBracesCount = jsonString.split("}").length - 1;

	while (openBracesCount > closeBracesCount) {
		jsonString += "}";
		closeBracesCount += 1;
	}

	while (closeBracesCount > openBracesCount) {
		jsonString = jsonString.slice(0, -1);
		closeBracesCount -= 1;
	}

	try {
		JSON.parse(jsonString);
		return jsonString;
	} catch (error) {
		return null;
	}
}

function addQuotesToPropertyNames(jsonString: string): string {
	const correctedJsonString = jsonString.replace(
		/(\w+):/g,
		(_, propertyName) => `"${propertyName}":`
	);
	try {
		JSON.parse(correctedJsonString);
		return correctedJsonString;
	} catch (error) {
		throw error;
	}
}

export function correctJson(jsonToLoad: string): string {
	try {
		JSON.parse(jsonToLoad);
		return jsonToLoad;
	} catch (error) {
		console.log("Caught JSON parse error, attempting to fix...");
		console.error("JSON parse error", error);
		const errorMessage = (error as Error).message;

		if (jsonToLoad.startsWith("[") && jsonToLoad.endsWith("]")) {
			jsonToLoad = `{"subtasks": ` + jsonToLoad + `}`;
		}

		if (errorMessage.startsWith("Bad escaped character")) {
			jsonToLoad = fixInvalidEscape(jsonToLoad, errorMessage);
		}

		if (/[^\\"}]\s*\w+\s*:/g.test(jsonToLoad)) {
			jsonToLoad = addQuotesToPropertyNames(jsonToLoad);
			try {
				JSON.parse(jsonToLoad);
				return jsonToLoad;
			} catch (error) {
				console.error("JSON parse error - add quotes", error);
			}
		}

		const balancedStr = balanceBraces(jsonToLoad);
		if (balancedStr) {
			return balancedStr;
		}
	}
	return jsonToLoad;
}
