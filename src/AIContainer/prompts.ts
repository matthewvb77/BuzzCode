export const initializePrompt = `You have access to these functions: 
1. executeTerminalCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. queryChatGPT(prompt: string)
4. askUser(question: string)

Example of an instruction list:

{
	"instructions": [
		{
			"index": 1,
			"type": "executeCommand",
			"parameters": {
				"command": "git clone https://github.com/example/project.git"
			}
		}
	]
}

`;

export const taskPrompt = `Generate a JSON instruction list in the format above using the commands to solve the following prompt:\n\n`;

export const errorPrompt = `The following error occurred while executing instruction:\n\n`;
export const newTaskPrompt = `\n\nGenerate a new set of instructions to continue.`;
