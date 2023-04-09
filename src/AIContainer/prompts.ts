export const initializePrompt = `You have access to these functions: 
1. executeCommand(command: string)
2. generateFile(fileName: string, fileContents: string)
3. startNextTask(prompt: string)
4. askUser(question: string) --> only use this function if you are stuck and need to ask a human for help

Example of an instruction list:

{
	"instructions": [
		{
			"type": "executeCommand",
			"parameters": {
				"command": "git clone https://github.com/example/project.git"
			}
		}
	]
}

`;

export const taskPrompt = `Generate a JSON string instruction list in the format above using the commands to solve the following prompt. Escape necessary characters with backslashes:\n\n`;

export const errorPrompt = `The following error occurred while executing instruction:\n\n`;
export const newTaskPrompt = `\n\nGenerate a new set of instructions to continue.`;
