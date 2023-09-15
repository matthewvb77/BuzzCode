import { shell } from "../settings/configuration";

/*
OpenAI's function calling api is limited to returning a single function call.
This function allows us to call multiple functions in sequence.
*/
export const functionCaller = [
	{
		name: "callFunctions",
		description: "Call any number of functions in sequence",
		parameters: {
			type: "object",
			properties: {
				/* --------------- Control Primitives START --------------- */
				executeTerminalCommand: {
					name: "executeTerminalCommand",
					description: `Execute a terminal command in the ${shell} shell`,
					parameters: {
						type: "object",
						properties: {
							command: {
								type: "string",
								description: "The command to execute",
							},
						},
						required: ["command"],
					},
				},

				generateFile: {
					name: "generateFile",
					description: "Generate a file with the given name and contents",
					parameters: {
						type: "object",
						properties: {
							fileName: {
								type: "string",
								description: "The name of the file to generate",
							},
							fileContents: {
								type: "string",
								description: "The contents of the file to generate",
							},
						},
						required: ["fileName", "fileContents"],
					},
				},

				askUser: {
					name: "askUser",
					description: "Ask the user a question -- only use as a last resort",
					parameters: {
						type: "object",
						properties: {
							question: {
								type: "string",
								description: "The question to ask the user",
							},
						},
						required: ["question"],
					},
				},

				recurse: {
					name: "recurse",
					description: "Recurse with the given prompt",
					parameters: {
						type: "object",
						properties: {
							newPrompt: {
								type: "string",
								description: "The prompt to recurse with",
							},
						},
						required: ["newPrompt"],
					},
				},

				/* --------------- Control Primitives END --------------- */
			},
			required: [],
		},
	},
];
