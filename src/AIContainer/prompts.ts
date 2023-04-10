export const initializePrompt = `You have access to these functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. recurse(prompt: string) --> call this function with a new prompt to continue the iterative development process
4. askUser(question: string) --> only use this function if you are stuck and need to ask a human for help
If an error or failure occurs the recurse process will happen automatically.

Example of an instruction list:

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

`;

export const taskPrompt = `Generate a JSON instruction list in the format above using the commands to solve the following prompt. Escape necessary characters with backslashes:\n\n`;
