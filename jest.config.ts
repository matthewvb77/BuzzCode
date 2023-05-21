module.exports = {
	roots: [
		"./src", // replace this with the path to the folder that contains your source files
	],
	testMatch: [
		"**/__tests__/**/*.+(ts|tsx|js)",
		"**/?(*.)+(spec|test).+(ts|tsx|js)",
	],
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest",
	},
};
