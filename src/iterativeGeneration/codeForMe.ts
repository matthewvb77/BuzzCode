export async function iterativeGeneration(input: string, inputType: string) {
	/* ----------------------------- Generate function file ------------------------------- */
	if (inputType === "description") {
		const prompt = `Generate a function that passes the following test suite:\n\n${input}\n\nFunction:`;

		// TODO: create function file from api query
	} else if (inputType === "test") {
		// TODO: create function file from input
	} else {
		throw new Error("Invalid input type");
	}

	/* ----------------------------- Generate test file ------------------------------- */
	// TODO: create test file from api query(function file contents)

	/* ----------------------------- Run Tests ------------------------------- */
	// TODO: run tests

	// if (tests pass) { output explanation }
	// else { run iterate() and feed in error message or test failure message as input }
}
