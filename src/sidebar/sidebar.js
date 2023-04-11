(function () {
	const userInput = document.getElementById("user-input");
	const inputTypeSelect = document.getElementById("input-type");

	function updatePlaceholder() {
		switch (inputTypeSelect.value) {
			case "task":
				userInput.placeholder = "Give a task...";
				break;
			case "question":
				userInput.placeholder = "Ask a question...";
				break;
			default:
				throw new Error("Invalid input type");
		}
	}

	updatePlaceholder();
	inputTypeSelect.addEventListener("change", updatePlaceholder);

	document.getElementById("submit-button").addEventListener("click", () => {
		const input = document.getElementById("user-input").value;
		const inputType = document.getElementById("input-type").value;

		vscode.postMessage({ command: "submit", input, inputType });
	});
})();
