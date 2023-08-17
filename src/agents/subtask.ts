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
