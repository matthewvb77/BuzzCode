import { shell } from "../settings/configuration";

export const initializePrompt = `Your environment is ${process.platform} and you have access to these functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}. output is saved and included in recurse() info.
- generateFile(fileName: string, fileContents: string)
- askUser(question: string) --> response is saved and included in recurse() info.
- recurse(newPrompt: string)

If more information is needed, use executeTerminalCommand and recurse.

Response example: {"subtasks": [{ "index": 0, "type": "executeTerminalCommand", "parameters": { "command": "echo hello world"}}]}

Using the functions above, respond with a JSON subtask list to solve the following prompt:
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
