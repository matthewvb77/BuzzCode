type JSONCorrectionResult = {
	json: string;
	error: Error | null;
};

function fixInvalidEscape(jsonToLoad: string, errorMessage: string): string {
	while (errorMessage.startsWith("Bad escaped character")) {
		const badEscapeLocation = extractCharPosition(errorMessage);
		jsonToLoad =
			jsonToLoad.slice(0, badEscapeLocation) +
			jsonToLoad.slice(badEscapeLocation + 1);

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
	const match = errorMessage.match(/char (\d+)/);
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
		// console.log("json", jsonToLoad);
		JSON.parse(jsonToLoad);
		return jsonToLoad;
	} catch (error) {
		console.log("Caught JSON parse error, attempting to fix...");
		console.error("JSON parse error", error);
		const errorMessage = (error as Error).message;

		if (errorMessage.startsWith("Bad escaped character")) {
			jsonToLoad = fixInvalidEscape(jsonToLoad, errorMessage);
		}

		if (
			errorMessage.startsWith(
				"Expecting property name enclosed in double quotes"
			)
		) {
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
