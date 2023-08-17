import { shell } from "../settingsPage/configuration";

export const initializePrompt = `You have access to these 4 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)
- askUser(question: string) --> Use as a last resort. Response is only used used in recurse() context.
- recurse(newPrompt: string) --> Upon any error this will happen automatically.

Response example: {"subtasks": [{ "index": 0, "type": "executeTerminalCommand", "parameters": { "command": "echo hello world"}}]}

Using the those 4 functions and following the response format above, respond with a JSON subtask list to solve the following prompt:
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
