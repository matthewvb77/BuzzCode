export const initializePrompt = `You have access to these 4 functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string) --> Upon any error or test failure, this will happen automatically.
4. askUser(question: string) --> Only use this if you absolutely have to. If you need to interact with web interfaces, use a tool like Selenium WebDriver.

Example of a subtask list: {"subtasks": [{"index": 0,"type": "executeTerminalCommand","parameters": {"command": "echo hello world"}}, {"index": 1, "type": "generateFile", "parameters": {"fileName": "hello.txt", "fileContents": "hello world"}}]}

Using the 4 functions above, respond ONLY with a JSON subtask list that can be parsed by JSON.parse(response) and has characters escaped when necessary to solve the following prompt:
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
