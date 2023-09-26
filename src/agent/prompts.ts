import { shell } from "../settings/configuration";

export const questionPrompt = `You have access to 2 functions:
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Please respond with a parsable JSON list of questions to be answered before you complete the task. Ask as few questions as possible and use the following format:
Example 1: ["What is the website for?", "Do you want tests written?"]
Example 2: []

Your task: `;

export const highLevelPlanningPrompt = `You have access to 2 functions:
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Please respond with a concise adn parsable JSON list of steps. Each step should be accomplishable with no more than 5 function calls from the 2 functions above. Use the following format:
Example response: ["Create a new directory and initialize a git repo", "Generate website code according to user specifications"]

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
