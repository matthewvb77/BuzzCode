export interface Subtask {
	index: number;
	type: string;
	parameters: any;
	state?: string;
}

export const acceptableStates: Array<string> = [
	"initial",
	"active",
	"completed",
	"cancelled",
	"error",
	"blocked",
	"started",
	"waiting",
];

export function jsonToSubtasks(input: any): Subtask[] {
	const subtasks: Subtask[] = [];
	let index = 0;

	for (const key in input) {
		if (input.hasOwnProperty(key)) {
			const functionType = key;
			// Force params to be an array
			const params = Array.isArray(input[key]) ? input[key] : [input[key]];

			for (const param of params) {
				subtasks.push({
					index: index++,
					type: functionType,
					parameters: param,
				});
			}
		}
	}

	return subtasks;
}
