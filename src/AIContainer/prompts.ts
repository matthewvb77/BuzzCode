export const initializePrompt = `You have access to these 4 functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string) --> Upon any error or test failure, this will happen automatically.

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

Using the 3 functions and following the response format above, respond with a JSON subtask list that can be parsed by the javascript line JSON.parse(response) to solve the following prompt:
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
