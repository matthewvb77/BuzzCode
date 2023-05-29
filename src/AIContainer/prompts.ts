import { shell } from "../settings/configuration";

export const initializePrompt = `Your environment is ${process.platform} and you have access to these 3 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string) --> always use this when creating files
- recurse(newPrompt: string) --> will happen automatically upon an error or failure.

Response example:
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

Using the 3 functions above, respond with a JSON subtask list to solve the following prompt:
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
