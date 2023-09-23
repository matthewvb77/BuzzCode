import { shell } from "../settings/configuration";

export const questionPrompt = `You're a software engineering agent with access to 2 functions:
- executeTerminalCommand(command: string)
- generateFile(fileName: string, fileContents: string)

Response example: {"questions": [{"question": "What language should the website be programmed in?"}, {"question": "Do you want tests written?"}]}
Response example: {"questions": []}

Using the response format above, respond with a parsable JSON list of questions to ask the user before solving the task:`;

export const highLevelPlanningPrompt = `You're a software engineering agent with access to 2 functions:
- executeTerminalCommand(command: string)
- generateFile(fileName: string, fileContents: string)

Response example: {"steps": [{"step": "Create a new directory, initialize a git repository, and create a README.md file."}, {"step": "Create the website according to user specifications."}]}

Using the response format above, respond with a JSON list of steps achievable by at most 5 function calls:
`;

export const planningPrompt = `You have access to 2 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)

Response example: {"subtasks": [{ "index": 0, "type": "executeTerminalCommand", "parameters": { "command": "echo hello world"}}]}

Using those 2 functions and following the response format above, respond with a JSON subtask list to solve the following prompt:
`;
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
