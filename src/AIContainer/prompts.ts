export const initializePrompt = `You have access to these 4 functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string) --> This will happen automatically if any error occurs.
4. askUser(question: string) --> Only use this if you absolutely have to. If you need to interact with web interfaces, use a tool like Selenium WebDriver.

Example of a subtask list: {"subtasks": [{"index": 0,"type": "executeTerminalCommand","parameters": {"command": "echo hello world"}}]}

This is an API call and your response will be parsed with JSON.parse(response). Respond with only syntactically correct JSON, and escape characters when necessary.
Using the 4 functions above, respond with a JSON subtask list with characters escaped as necessary to solve the following prompt: 
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
