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

				// Update progress text
				switch (type) {
					case "executeTerminalCommand":
						progressText.textContent = `Executing terminal command...`;
						break;

					case "generateFile":
						progressText.textContent = `Generating file: ${parameters.fileName}`;
						break;

					case "recurse":
						progressText.textContent = `Recursing with new prompt...`;
						break;

					case "askUser":
						progressText.textContent = `Asking user for input...`;
						break;

					default:
						progressText.textContent = `Unknown subtask type "${type}"`;
						break;
				}
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

					// create subtask loader
					const subtaskLoader = document.createElement("div");
					subtaskLoader.setAttribute("id", `subtask-loader-${subtask.index}`);
					subtaskLoader.classList.add("loader");
					changeLoaderState(subtaskLoader, "loader-initial");
					listItem.appendChild(subtaskLoader);

					const subtaskText = document.createElement("span");
					subtaskText.classList.add("subtask-text");
					subtaskText.textContent = subtask.type;
					listItem.appendChild(subtaskText);

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
