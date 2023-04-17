export const initializePrompt = `You have access to these 4 functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string) --> This will happen automatically if any error occurs.
4. askUser(question: string) --> Ask the user a question and recurse with their response.

Don't use askUser unless you absolutely have to. If you need to interact with web interfaces, use a tool like Selenium WebDriver.

Example of a subtask list:

{"subtasks": [{"index": 0,"type": "executeTerminalCommand","parameters": {"command": "echo hello world"}}]}

`;

export const taskPrompt = `JSON.parse(response) will be used to parse your response, so respond only with JSON, and escape characters when necessary.
Generate a JSON subtask list using the 4 functions above to solve this prompt: `;

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
