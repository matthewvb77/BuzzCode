import { shell } from "../settings/configuration";

export const initializePrompt = `Your environment is ${process.platform} and you have access to these functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}. output is saved and included in recurse() call. The user can see the output.
- generateFile(fileName: string, fileContents: string) --> always use this when creating files.
- askUser(question: string) --> response is saved and included in recurse() call.
- recurse(newPrompt: string)

Always use terminal commands and recurse to gain information and context.

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
