(function () {
	const userInputBox = document.getElementById("user-input");
	const inputTypeSelect = document.getElementById("input-type");
	const responseLabel = document.getElementById("response-label");
	const responseArea = document.getElementById("response-area");
	const taskProgress = document.getElementById("task-progress");

	function updatePlaceholderAndResponse() {
		switch (inputTypeSelect.value) {
			case "task":
				userInputBox.placeholder = "Give a task...";
				taskProgress.classList.add("show-component");
				responseLabel.classList.remove("show-component");
				responseArea.classList.remove("show-component");
				break;
			case "question":
				userInputBox.placeholder = "Ask a question...";
				taskProgress.classList.remove("show-component");
				responseLabel.classList.add("show-component");
				responseArea.classList.add("show-component");
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

	userInputBox.addEventListener("keydown", function (event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			document.getElementById("submit-button").click();
		}
	});

	document.getElementById("submit-button").addEventListener("click", () => {
		const input = userInputBox.value;
		const inputType = inputTypeSelect.value;

		vscode.postMessage({ command: "submit", input, inputType });
	});

	window.addEventListener("message", (event) => {
		const message = event.data;
		switch (message.command) {
			case "response":
				const responseArea = document.getElementById("response-area");
				responseArea.value = message.text;
				break;
			default:
				console.warn("Unknown message received:", message);
		}
	});
})();
