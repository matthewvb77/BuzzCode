import { shell } from "../settings/configuration";

export const initializePrompt = `You have access to 2 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Response example: {"subtasks": [{ "index": 0, "type": "executeTerminalCommand", "parameters": { "command": "echo hello world"}}]}

Using those 2 functions and following the response format above, respond with a JSON subtask list to solve the following prompt:
`;

export const highLevelPlanningPrompt = `You're a software engineering agent with access to 2 functions:
- executeTerminalCommand(command: string)
- generateFile(fileName: string, fileContents: string)

Response example: {"questions": [{"question": "What language should the website be programmed in?"}, {"question": "Do you want tests written?"}]}
Response example: {"questions": []}

Using the response format above, respond with a parsable JSON list of questions to ask the user before solving the task:`;
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
