(function () {
	const inputTypeSelect = document.getElementById("input-type");
	const questionTab = document.getElementById("question-tab");
	const taskTab = document.getElementById("task-tab");
	const userTaskInputBox = document.getElementById("task-user-input");
	const userQuestionInputBox = document.getElementById("question-user-input");
	const taskSubmitButton = document.getElementById("task-submit-button");
	const taskCancelButton = document.getElementById("task-cancel-button");
	const subtasksContainer = document.getElementById("subtasks-container");
	const progressContainer = document.getElementById("progress-container");
	const questionSubmitButton = document.getElementById(
		"question-submit-button"
	);
	const buttonsContainer = document.getElementById("buttons-container");
	const progressLoader = document.getElementById("progress-loader");
	const progressText = document.getElementById("progress-text");

	var subtaskCount = 0;
	var previousSubtaskCount = 0;

	function updatePlaceholderAndResponse() {
		switch (inputTypeSelect.value) {
			case "task":
				questionTab.classList.remove("show-component");
				taskTab.classList.add("show-component");
				break;
			case "question":
				taskTab.classList.remove("show-component");
				questionTab.classList.add("show-component");
				break;
			default:
				throw new Error("Invalid input type");
		}
	}

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

	updatePlaceholderAndResponse();
	inputTypeSelect.addEventListener("change", updatePlaceholderAndResponse);
	window.addEventListener("load", () => {
		document.body.classList.add("body-loaded");
	});

	userTaskInputBox.addEventListener("keydown", function (event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			taskSubmitButton.click();
		}
	});

	userQuestionInputBox.addEventListener("keydown", function (event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			questionSubmitButton.click();
		}
	});

	taskSubmitButton.addEventListener("click", () => {
		const input = userTaskInputBox.value;
		subtaskCount = 0;
		vscode.postMessage({ command: "submit-task", input });
	});

	questionSubmitButton.addEventListener("click", () => {
		const input = userQuestionInputBox.value;

		vscode.postMessage({ command: "submit-question", input });
	});

	taskCancelButton.addEventListener("click", () => {
		progressLoader.classList.remove("loader-waiting");
		buttonsContainer.classList.remove("show-component");
		vscode.postMessage({ command: "cancel-task" });
	});

	document
		.getElementById("confirm-button")
		.addEventListener("click", () => userAction("confirm"));
	document
		.getElementById("cancel-button")
		.addEventListener("click", () => userAction("cancel"));
	document
		.getElementById("regenerate-button")
		.addEventListener("click", () => userAction("regenerate"));

	function userAction(action) {
		progressLoader.classList.remove("loader-waiting");

		if (action === "regenerate") {
			progressText.textContent = "Regenerating subtasks...";

			// Remove subtasks with an index >= previousSubtaskCount
			while (subtasksContainer.children.length > previousSubtaskCount) {
				subtasksContainer.removeChild(subtasksContainer.lastChild);
			}
			subtaskCount = previousSubtaskCount;
		}

		buttonsContainer.classList.remove("show-component");

		vscode.postMessage({
			command: "userAction",
			action: action,
		});
	}

	function changeLoaderState(loader, state) {
		if (!loader) {
			return;
		}
		loader.classList.remove("loader-completed");
		loader.classList.remove("loader-cancelled");
		loader.classList.remove("loader-waiting");
		loader.classList.remove("loader-initial");

		if (state === "loader-active") {
			// The loader is active by default
		} else {
			loader.classList.add(state);
		}
	}

	window.addEventListener("message", (event) => {
		const message = event.data;
		const activeSubtaskLoader = document.querySelector(
			".subtask-container .loader:not(.loader-completed):not(.loader-initial):not(.loader-cancelled)"
		);

		switch (message.command) {
			case "response":
				const responseArea = document.getElementById("response-area");
				responseArea.value = message.text;
				break;

			case "onStartSubtask":
				const { index, type, parameters } = message.subtask;
				const subtaskIndex = previousSubtaskCount + index;

				// if the subtask is not the first one in a recursive call, mark the previous subtask as completed
				if (index !== 0) {
					const previousLoader = document.getElementById(
						`subtask-loader-${subtaskIndex - 1}`
					);

					changeLoaderState(previousLoader, "loader-completed");
				}
				const currentLoader = document.getElementById(
					`subtask-loader-${subtaskIndex}`
				);
				changeLoaderState(currentLoader, "loader-active");

				progressText.textContent = getSubtaskSummary(
					type,
					parameters,
					"ongoing"
				);
				break;

			case "showSubtasks":
				progressText.textContent = "Please review the subtasks below:";
				changeLoaderState(progressLoader, "loader-waiting");
				buttonsContainer.classList.add("show-component");

				message.subtasks.forEach((subtask) => {
					// if this is a recursive call, add the subtasks to the end of the list
					const subtaskIndex = subtaskCount + subtask.index;

					// create subtask container
					const listItem = document.createElement("li");
					listItem.classList.add("subtask-container");

					// create subtask header container
					const subtaskHeader = document.createElement("div");
					subtaskHeader.classList.add("subtask-header");
					listItem.appendChild(subtaskHeader);

					// create subtask loader
					const subtaskLoader = document.createElement("div");
					subtaskLoader.setAttribute("id", `subtask-loader-${subtaskIndex}`);
					subtaskLoader.classList.add("loader");
					changeLoaderState(subtaskLoader, "loader-initial");
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
				previousSubtaskCount = subtaskCount;
				subtaskCount += message.subtasks.length;
				break;

			case "showTaskStarted":
				subtasksContainer.innerHTML = "";
				subtaskCount = 0;
				progressText.textContent = "Generating subtasks...";
				changeLoaderState(progressLoader, "loader-active");
				taskCancelButton.classList.add("show-component");
				progressContainer.classList.add("show-component");
				break;

			case "showTaskCompleted":
				changeLoaderState(activeSubtaskLoader, "loader-completed");
				changeLoaderState(progressLoader, "loader-completed");
				progressText.textContent = "Task Completed";
				taskCancelButton.classList.remove("show-component");
				break;

			case "showTaskCancelled":
				changeLoaderState(activeSubtaskLoader, "loader-cancelled");
				changeLoaderState(progressLoader, "loader-cancelled");
				progressText.textContent = "Task Cancelled";
				taskCancelButton.classList.remove("show-component");
				break;

			case "showTaskError":
				changeLoaderState(activeSubtaskLoader, "loader-cancelled");
				changeLoaderState(progressLoader, "loader-cancelled");
				progressText.textContent = "Error Occurred: Terminating Task";
				taskCancelButton.classList.remove("show-component");
				break;

			case "onSubtaskError":
				changeLoaderState(activeSubtaskLoader, "loader-cancelled");
				progressText.textContent = "Error Occurred: Generating next steps";
				break;

			default:
				console.warn("Unknown message received:", message);
		}
	});
})();
