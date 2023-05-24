import { shell } from "../settings/configuration";

export const initializePrompt = `Your environment is ${process.platform} and you have access to these 3 functions: 
1. executeTerminalCommand(command: string) --> shell type is ${shell}, escape characters when necessary, and read -p is not supported
2. generateFile(fileName: string, fileContents: string) --> always use this when creating files
3. recurse(newPrompt: string) --> will happen automatically upon an error or failure.

Response example:
{"subtasks":[{"index":0,"type":"executeTerminalCommand","parameters":{"command":"echo hello world"}}]}

Using the 3 functions above, respond with a JSON subtask list that can be parsed by the javascript line "JSON.parse(response)" to solve the following prompt:
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
