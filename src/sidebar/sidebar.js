(function () {
	const userInputBox = document.getElementById("user-input");
	const inputTypeSelect = document.getElementById("input-type");
	const responseLabel = document.getElementById("response-label");
	const responseArea = document.getElementById("response-area");

	function updatePlaceholderAndResponse() {
		switch (inputTypeSelect.value) {
			case "task":
				userInputBox.placeholder = "Give a task...";
				responseLabel.style.display = "none";
				responseArea.style.display = "none";
				break;
			case "question":
				userInputBox.placeholder = "Ask a question...";
				responseLabel.style.display = "block";
				responseArea.style.display = "block";
				break;
			default:
				throw new Error("Invalid input type");
		}
	}

	updatePlaceholderAndResponse();
	inputTypeSelect.addEventListener("change", updatePlaceholderAndResponse);

	document.getElementById("submit-button").addEventListener("click", () => {
		const input = userInputBox.value;
		const inputType = inputTypeSelect.value;

		vscode.postMessage({ command: "submit", input, inputType });
	});
})();
