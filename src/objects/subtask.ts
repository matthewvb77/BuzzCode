export interface Subtask {
	index: number;
	type: string;
	parameters: any;
	state?: SubtaskState;
}

export enum SubtaskState {
	initial = "initial",
	active = "active",
	completed = "completed",
	cancelled = "cancelled",
	error = "error",
	blocked = "blocked",
	started = "started",
	waiting = "waiting",
}
