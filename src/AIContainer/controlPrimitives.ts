import { shell } from "../settings/configuration";

export const functions = [
	{
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
	{
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
	{
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
	{
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
];

/*
const functions = [
        {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        }
    ];
*/
