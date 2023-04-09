(function () {
	const inputTypeSelect = document.getElementById("input-type");
	const userInput = document.getElementById("user-input");

	function updatePlaceholder() {
		switch (inputTypeSelect.value) {
			case "description":
				userInput.placeholder = "Enter a function description...";
				break;
			case "test":
				userInput.placeholder = "Enter an existing function...";
				break;
			default:
				throw new Error("Invalid input type");
		}
	}

	function hasValidAPIKey() {
		const apiKey = vscode.workspace.getConfiguration("testwise").get("apiKey");
		return (
			apiKey !== undefined && apiKey !== null && apiKey.toString().trim() !== ""
		);
	}

	updatePlaceholder();
	inputTypeSelect.addEventListener("change", updatePlaceholder);

	document.getElementById("submit-button").addEventListener("click", () => {
		const input = document.getElementById("user-input").value;
		const inputType = document.getElementById("input-type").value;
		if (hasValidAPIKey()) {
			vscode.postMessage({ command: "submit", input, inputType });
		} else {
			vscode.window.showErrorMessage("No valid API key found.");
		}
	});
})();
