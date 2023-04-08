export const initialize = `You have access to these 4 functions: 
1. executeCommand(command: string) - executes a commmand in the terminal
2. generateFile(file name: string, fileContents: string) - generates a file with the given name and contents
3. queryChatGPT(prompt: string) - queries the OpenAI API with the given prompt
4. askUser(Question: string) - asks the user for a resource (e.g. api key, login credentials, etc.)

Here is an example of an instruction list:

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

Use the commands at your disposal to generate an instruction list to solve the following prompt:

`;

const errorPrompt = `The following error occurred while executing instruction X: . Please generate a new set of instructions to continue.`;
