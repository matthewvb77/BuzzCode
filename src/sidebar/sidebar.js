(function () {
	/* --------------------------------- Variables ------------------------------------ */
	const userInputBox = document.getElementById("user-input");
	const taskSubmitButton = document.getElementById("submit-button");
	const taskCancelButton = document.getElementById("task-cancel-button");
	const subtasksContainer = document.getElementById("subtasks-container");
	const progressContainer = document.getElementById("progress-container");
	const buttonsContainer = document.getElementById("buttons-container");
	const progressLoader = document.getElementById("progress-loader");
	const progressText = document.getElementById("progress-text");

	let previousSubtaskCount;

	/* --------------------------- Accessory Event Listeners --------------------------  */

	window.addEventListener("load", () => {
		document.body.classList.add("body-loaded");
	});

	userInputBox.addEventListener("keydown", function (event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			taskSubmitButton.click();
		}
	});

	taskSubmitButton.addEventListener("click", () => {
		const input = userInputBox.value;
		previousSubtaskCount = 0;
		vscode.postMessage({ command: "submit", input });
	});

	taskCancelButton.addEventListener("click", () => {
		progressLoader.classList.remove("loader-waiting");
		buttonsContainer.classList.remove("show-component");
		vscode.postMessage({ command: "cancel-task" });
	});

	document.getElementById("confirm-button").addEventListener("click", () => {
		previousSubtaskCount =
			document.querySelectorAll(".subtask-container").length;
		userAction("confirm");
	});
	document
		.getElementById("cancel-button")
		.addEventListener("click", () => userAction("cancel"));
	document
		.getElementById("regenerate-button")
		.addEventListener("click", () => userAction("regenerate"));

	/* ------------------------------ Helpers --------------------------- */

	function getSubtaskSummary(type, parameters, tense) {
		if (!(tense === "ongoing" || tense === "imperative")) {
			throw (error = new Error("Invalid tense"));
		}

		switch (type) {
			case "executeTerminalCommand":
				if (tense === "imperative") {
					return `Execute terminal command`;
				} else if (tense === "ongoing") {
					return `Executing terminal command...`;
				}
				break;

			case "generateFile":
				if (tense === "imperative") {
					return `Generate file: ${parameters.fileName}`;
				} else if (tense === "ongoing") {
					return `Generating file: ${parameters.fileName}`;
				}
				break;

			case "recurse":
				if (tense === "imperative") {
					return `Recurse with new prompt`;
				} else if (tense === "ongoing") {
					return `Recursing with new prompt...`;
				}
				break;

			case "askUser":
				if (tense === "imperative") {
					return `Ask user for input`;
				} else if (tense === "ongoing") {
					return `Asking user for input...`;
				}
				break;

			default:
				return `Unknown subtask type "${type}"`;
		}
	}

	function userAction(action) {
		progressLoader.classList.remove("loader-waiting");

		if (action === "regenerate") {
			progressText.textContent = "Regenerating subtasks...";
			// console.log("num subtasks: ", subtasksContainer.children.length);
			// console.log("num prev subtasks: ", previousSubtaskCount);
			while (subtasksContainer.children.length > previousSubtaskCount) {
				subtasksContainer.removeChild(subtasksContainer.lastChild);
			}
		}

		buttonsContainer.classList.remove("show-component");

		vscode.postMessage({
			command: "userAction",
			action: action,
		});
	}

	function changeLoaderState(loader, state) {
		if (!loader) {
			throw (error = new Error("Invalid arguments"));
		}
		loader.classList.remove("loader-completed");
		loader.classList.remove("loader-cancelled");
		loader.classList.remove("loader-waiting");
		loader.classList.remove("loader-initial");
		loader.classList.remove("loader-active");
		loader.classList.remove("loader-blocked");

		loader.classList.add("loader-" + state);
	}

	function updateTaskState(state) {
		switch (state) {
			case "started":
				subtasksContainer.innerHTML = "";

				changeLoaderState(progressLoader, "active");
				progressText.textContent = "Generating subtasks...";
				taskCancelButton.classList.add("show-component");

				progressContainer.classList.add("show-component");
				break;

			case "waiting":
				changeLoaderState(progressLoader, "waiting");
				progressText.textContent = "Awaiting user response...";
				break;

			case "completed":
				changeLoaderState(progressLoader, "completed");
				progressText.textContent = "Task Completed";
				taskCancelButton.classList.remove("show-component");
				break;

			case "cancelled":
				changeLoaderState(progressLoader, "cancelled");
				progressText.textContent = "Task Cancelled";
				taskCancelButton.classList.remove("show-component");
				break;

			case "error":
				changeLoaderState(progressLoader, "cancelled");
				progressText.textContent = "Error Occurred: Terminating Task";
				taskCancelButton.classList.remove("show-component");
				break;

			default:
				throw (error = new Error("Invalid state"));
		}
	}

	function showSubtasks(subtasks, subtaskStates = []) {
		subtasks.forEach((subtask) => {
			// create subtask container
			const listItem = document.createElement("li");
			listItem.classList.add("subtask-container");

			// create subtask header container
			const subtaskHeader = document.createElement("div");
			subtaskHeader.classList.add("subtask-header");
			listItem.appendChild(subtaskHeader);

			// create subtask loader
			const subtaskLoader = document.createElement("div");
			subtaskLoader.setAttribute("id", `subtask-loader-${subtask.index}`);
			subtaskLoader.classList.add("loader");

			if (subtaskStates.length > 0) {
				// console.log(
				// 	"changing subtask " +
				// 		subtask.index +
				// 		" to " +
				// 		subtaskStates[subtask.index]
				// );
				changeLoaderState(subtaskLoader, subtaskStates[subtask.index]);
			} else {
				changeLoaderState(subtaskLoader, "initial");
			}

			subtaskHeader.appendChild(subtaskLoader);

			// create subtask text
			const subtaskText = document.createElement("span");
			subtaskText.classList.add("subtask-text");
			subtaskText.textContent = getSubtaskSummary(
				subtask.type,
				subtask.parameters,
				"imperative"
			);
			subtaskHeader.appendChild(subtaskText);

			// create subtask expand icon
			const subtaskExpandIcon = document.createElement("span");
			subtaskExpandIcon.classList.add("subtask-expand-icon");
			subtaskHeader.appendChild(subtaskExpandIcon);

			// create subtask details container
			const subtaskDetails = document.createElement("div");
			subtaskDetails.classList.add("subtask-details");

			// populate subtask details
			switch (subtask.type) {
				case "generateFile":
					subtaskDetails.textContent = `Warning: this could overwrite an existing file.`;
					subtaskDetails.classList.add("warning-text");
					break;

				case "executeTerminalCommand":
					const codeBlock = document.createElement("code");
					codeBlock.textContent = `> ` + subtask.parameters.command;
					subtaskDetails.appendChild(codeBlock);
					break;

				case "recurse":
					const newPromptTextArea = document.createElement("textarea");
					newPromptTextArea.classList.add("subtask-details-textarea");
					newPromptTextArea.textContent = `New prompt: ${subtask.parameters.newPrompt}`;
					subtaskDetails.appendChild(newPromptTextArea);
					break;

				case "askUser":
					subtaskDetails.textContent = `Ask User: ${subtask.parameters.question}`;
					break;

				default:
					throw error("Unknown subtask type: " + subtask.type);
			}

			listItem.appendChild(subtaskDetails);

			// create subtask details
			listItem.addEventListener("click", () => {
				listItem.classList.toggle("expanded");
			});

			subtasksContainer.appendChild(listItem);
		});
	}

	/* --------------------------- Primary Message Handler ------------------------- */

	window.addEventListener("message", (event) => {
		const message = event.data;
		const activeSubtaskLoader = document.querySelector(
			".subtask-container .loader.loader-active"
		);

		switch (message.command) {
			case "onStartSubtask":
				const { index, type, parameters } = message.subtask;

				// if the subtask is not the first one in a recursive call, mark the previous subtask as completed
				if (index > 0) {
					const previousLoader = document.getElementById(
						`subtask-loader-${index - 1}`
					);

					if (previousLoader.classList.contains("loader-active")) {
						changeLoaderState(previousLoader, "completed");
					}
				}

				const currentLoader = document.getElementById(
					`subtask-loader-${index}`
				);
				changeLoaderState(currentLoader, "active");

				progressText.textContent = getSubtaskSummary(
					type,
					parameters,
					"ongoing"
				);

				break;

			case "showSubtasks":
				showSubtasks(message.subtasks);
				buttonsContainer.classList.add("show-component");
				break;

			case "updateTaskState":
				if (activeSubtaskLoader) {
					if (message.taskState === "completed") {
						changeLoaderState(activeSubtaskLoader, "completed");
					} else if (
						message.taskState === "cancelled" ||
						message.taskState === "error"
					) {
						changeLoaderState(activeSubtaskLoader, "cancelled");
					}
				}
				updateTaskState(message.taskState);
				break;

			case "updateSubtaskState":
				const subtaskLoader = document.getElementById(
					`subtask-loader-${message.index}`
				);
				changeLoaderState(subtaskLoader, message.subtaskState);
				break;

			case "onSubtaskError":
				changeLoaderState(activeSubtaskLoader, "cancelled");
				let subtaskLoaders = subtasksContainer.querySelectorAll(
					".subtask-container .loader"
				);
				for (let i = message.index + 1; i < subtaskLoaders.length; i++) {
					changeLoaderState(subtaskLoaders[i], "blocked");
				}
				progressText.textContent = "Error Occurred: Generating next steps";
				break;

			case "rebuild":
				// console.log("starting rebuild");
				if (message.state.userInput) {
					userInputBox.value = message.state.userInput;
				}
				if (message.state.taskState) {
					// console.log("updating task state to " + message.state.taskState);
					updateTaskState(message.state.taskState);
				}
				if (message.state.taskInProgress) {
					// console.log("task is in progress, show cancel button");
					taskCancelButton.classList.add("show-component");
				}
				if (message.state.taskInProgress && message.state.subtasks) {
					if (message.state.subtasks.length > 0) {
						// console.log("showing progress container");
						showSubtasks(message.state.subtasks, message.state.subtaskStates);
						progressContainer.classList.add("show-component");
					}
				}

				if (
					message.state.taskState === "waiting" &&
					!document.querySelector(".subtask-container .loader.loader-waiting")
				) {
					// console.log("showing button container");
					buttonsContainer.classList.add("show-component");
				}
				if (message.state.previousSubtaskCount) {
					// console.log(
					// 	"previous subtask count = " + message.state.previousSubtaskCount
					// );
					previousSubtaskCount = message.state.previousSubtaskCount;
				} else {
					// console.log("previous subtask count = 0");
					previousSubtaskCount = 0;
				}
				break;

			default:
				console.warn("Unknown message received:", message);
		}
	});
})();
