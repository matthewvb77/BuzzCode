(function () {
	const inputTypeSelect = document.getElementById("input-type");
	const questionTab = document.getElementById("question-tab");
	const taskTab = document.getElementById("task-tab");
	const userTaskInputBox = document.getElementById("task-user-input");
	const userQuestionInputBox = document.getElementById("question-user-input");
	const taskSubmitButton = document.getElementById("task-submit-button");
	const questionSubmitButton = document.getElementById(
		"question-submit-button"
	);
	const progressLoader = document.getElementById("progress-loader");
	const progressText = document.getElementById("progress-text");

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

	function getSubtaskSummary(type, parameters) {
		switch (type) {
			case "executeTerminalCommand":
				return `Executing terminal command...`;

			case "generateFile":
				return `Generating file: ${parameters.fileName}`;

			case "recurse":
				return `Recursing with new prompt...`;

			case "askUser":
				return `Asking user for input...`;

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

		vscode.postMessage({ command: "submit-task", input });
	});

	questionSubmitButton.addEventListener("click", () => {
		const input = userQuestionInputBox.value;

		vscode.postMessage({ command: "submit-question", input });
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
		}

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
			".subtask-container .loader:not(.loader-completed):not(.loader-initial)"
		);

		switch (message.command) {
			case "response":
				const responseArea = document.getElementById("response-area");
				responseArea.value = message.text;
				break;

			case "onStartSubtask":
				const { index, type, parameters } = message.subtask;

				// Update subtask loader states
				if (index !== 0) {
					const previousLoader = document.getElementById(
						`subtask-loader-${index - 1}`
					);
					changeLoaderState(previousLoader, "loader-completed");
				}
				const currentLoader = document.getElementById(
					`subtask-loader-${index}`
				);
				changeLoaderState(currentLoader, "loader-active");

				progressText.textContent = getSubtaskSummary(type, parameters);
				break;

			case "showSubtasks":
				const subtasksContainer = document.getElementById("subtasks-container");
				subtasksContainer.innerHTML = ""; // Clear the container
				progressText.textContent = "Please review the subtasks below:";
				changeLoaderState(progressLoader, "loader-waiting");

				message.subtasks.forEach((subtask) => {
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
					changeLoaderState(subtaskLoader, "loader-initial");
					subtaskHeader.appendChild(subtaskLoader);

					// create subtask text
					const subtaskText = document.createElement("span");
					subtaskText.classList.add("subtask-text");
					subtaskText.textContent = getSubtaskSummary(
						subtask.type,
						subtask.parameters
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
							subtaskDetails.textContent = `New prompt: ${subtask.parameters.prompt}`;
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
				break;

			case "showTaskStarted":
				const progressContainer = document.getElementById("progress-container");
				progressText.textContent = "Generating subtasks...";
				changeLoaderState(progressLoader, "loader-active");
				progressContainer.classList.add("show-component");
				break;

			case "showTaskCompleted":
				changeLoaderState(activeSubtaskLoader, "loader-completed");
				progressText.textContent = "Task Completed";
				changeLoaderState(progressLoader, "loader-completed");
				break;

			case "showTaskCancelled":
				changeLoaderState(activeSubtaskLoader, "loader-cancelled");
				progressText.textContent = "Task Cancelled";
				changeLoaderState(progressLoader, "loader-cancelled");
				break;

			case "showTaskError":
				changeLoaderState(activeSubtaskLoader, "loader-cancelled");
				progressText.textContent = "Error Occurred";
				changeLoaderState(progressLoader, "loader-cancelled");
				break;

			default:
				console.warn("Unknown message received:", message);
		}
	});
})();
