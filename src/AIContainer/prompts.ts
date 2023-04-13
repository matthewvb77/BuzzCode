export const initializePrompt = `You have access to these functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string) --> This will happen automatically if any error occurs.
4. askUser(question: string) --> Ask the user a question and recurse with their response.

Minimize user intervention. Don't use askUser unless you have to. If you need to interact with web interfaces, use a tool like Selenium WebDriver.

Example of a subtask list:

{"subtasks": [{"index": 0,"type": "executeTerminalCommand","parameters": {"command": "git clone https://github.com/example/project.git"}}]}

`;

export const taskPrompt = `Generate a JSON subtask list using the commands to solve the following prompt. Escape necessary characters with backslashes: `;

/*
{
	"subtasks": [
		{
			"index": 0,
			"type": "executeTerminalCommand",
			"parameters": {
				"command": "git clone https://github.com/example/project.git"
			}
		}
	]
}
*/
