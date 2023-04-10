export const initializePrompt = `You have access to these functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(newPrompt: string)
4. askUser(question: string) --> Ask the user a question and recurse with their response. USE THIS FUNCTION AS A LAST RESORT.
If an error occurs, the recurse process will happen automatically with the error message inluded in the newPrompt.

Example of an instruction list:

{"instructions": [{"index": 0,"type": "executeTerminalCommand","parameters": {"command": "git clone https://github.com/example/project.git"}}]}

`;

export const taskPrompt = `Generate a JSON instruction list using the commands to solve the following prompt. Escape necessary characters with backslashes:\n\n`;

/*
{
	"instructions": [
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
