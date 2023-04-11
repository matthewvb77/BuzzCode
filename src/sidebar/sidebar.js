(function () {
	const userInputBox = document.getElementById("user-input");
	const inputTypeSelect = document.getElementById("input-type");
	const responseLabel = document.getElementById("response-label");
	const responseArea = document.getElementById("response-area");

	function updatePlaceholderAndResponse() {
		switch (inputTypeSelect.value) {
			case "task":
				userInputBox.placeholder = "Give a task...";
				responseLabel.classList.remove("show-response");
				responseArea.classList.remove("show-response");
				break;
			case "question":
				userInputBox.placeholder = "Ask a question...";
				responseLabel.classList.add("show-response");
				responseArea.classList.add("show-response");
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

	document.getElementById("submit-button").addEventListener("click", () => {
		const input = userInputBox.value;
		const inputType = inputTypeSelect.value;

		vscode.postMessage({ command: "submit", input, inputType });
	});
})();
