import { shell } from "../settings/configuration";

export const initializePrompt = `You have access to these 4 functions: 
- executeTerminalCommand(command: string) --> shell type is ${shell}
- generateFile(fileName: string, fileContents: string)
- askUser(question: string) --> Use as a last resort. Response is only used used in recurse() context.
- recurse(newPrompt: string) --> Upon any error this will happen automatically.

Response example: {"subtasks": [{ "index": 0, "type": "executeTerminalCommand", "parameters": { "command": "echo hello world"}}]}

Using the those 4 functions and following the response format above, respond with a JSON subtask list to solve the following prompt:
`;

export const planningPrompt = `You are the planning phase of an AI software engineer agent. 
Actions: execute terminal command, generate file, ask user question, recurse with new prompt. Please break the following
task into steps that can each be accomplished by 5 or less of these actions.

Response example: {"steps": [{"step": "generate files needed a unique portfolio website"}, {"step": "initialize git repository,
 add, commit, and push changes"}, {"step": "create and run tests for all files in the working directory"}]}`;

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
