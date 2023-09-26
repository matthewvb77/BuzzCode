import { shell } from "../settings/configuration";

export const questionPrompt = `You have access to 2 functions:
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Please respond with a parsable JSON list of questions you need answered before you can complete the task, using the following format:
Example 1: ["What language should the website be programmed in?", "Do you want tests written?"]
Example 2: []

Your task: `;

export const highLevelPlanningPrompt = `You have access to 2 functions:
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Please respond with a parsable JSON list of steps. Each step should be accomplishable with no more than 5 function calls from the 2 functions above. Use the following format:
Example response: ["Create a new directory, initialize a git repository, and create a README.md file.", "Generate website code according to user specifications."]

Your task: `;

export const planningPrompt = `You have access to 2 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Please respond with a parsable JSON list of function calls, using the following format:
Response example: [{"type": "executeTerminalCommand", "parameters": {"command": "echo hello world"}}]

Your task: `;
/*
{
	"subtasks": [
		{
			"index": 0,
			"type": "executeTerminalCommand",
			"parameters": {
				"command": "echo hello world"
			}
		}
	]
}
*/
