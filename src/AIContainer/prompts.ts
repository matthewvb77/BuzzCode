import { shell } from "../settings/configuration";

export const initializePrompt = `The user's environment is ${process.platform} and you have access to these 3 commands: 
1. executeTerminalCommand(command: string) --> shell type is ${shell}
2. makeFile(name: string, contents: string)
3. recurse(newPrompt: string) --> Upon any error or test failure, this will happen automatically.
Don't execute or generate shell commands that bypass stderr and stdout, like "read -p".

Response format:
{
	"subtasks": [
		{
			"index": 0,
			"type": "executeTerminalCommand",
			"parameters": {
				"command": "echo hello world"
			}
		},
	]
}

Using the 3 functions and response format above, respond with a JSON subtask list that can be parsed by the javascript line "JSON.parse(response)" to solve the following prompt:
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
		},
		{
			"index": 1,
			"type": "generateFile",
			"parameters": {
				"fileName": "test.txt",
				"fileContents": "hello world"
			}
		}
	]
}
*/
