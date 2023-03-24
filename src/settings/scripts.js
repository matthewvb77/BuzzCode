(function () {
	let vscodeApi;
	const apiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";
	const submitButton = document.getElementById("saveSettings");

	window.addEventListener("message", (event) => {
		const message = event.data; // The JSON data that the extension sent
		if (message.command === "getVsCodeApi") {
			vscodeApi = message.data;
			if (submitButton) {
				submitButton.disabled = false;
			}
		} else {
			console.log("Unknown message received: ", message);
		}
	});

	window.postMessage({ command: "getVsCodeApi" }, "*");

	function updateSliderValue(sliderId, displayId) {
		const slider = document.getElementById(sliderId);
		const display = document.getElementById(displayId);

		if (slider && display) {
			display.innerText = slider.value;
		}
	}

	function updateSliderValueFromInput(sliderId, displayId) {
		const slider = document.getElementById(sliderId);
		const display = document.getElementById(displayId);

		if (slider && display) {
			slider.value = display.innerText;
		}
	}

	function handleEditableValueInput(event, sliderId, displayId) {
		if (!event.target) {
			return;
		}
		const target = event.target;

		const slider = document.getElementById(sliderId);
		const value = parseFloat(target.innerText);

		if (isNaN(value)) {
			target.innerText = slider.value;
		} else {
			slider.value = value.toString();
			updateSliderValue(sliderId, displayId);
		}
	}

	function initializeEventListeners() {
		const form = document.getElementById("settingsForm");
		const maxTokensSlider = document.getElementById("maxTokens");
		const temperatureSlider = document.getElementById("temperature");
		const maxTokensValue = document.getElementById("maxTokensValue");
		const temperatureValue = document.getElementById("temperatureValue");

		if (submitButton) {
			submitButton.disabled = true;
		}

		// update the slider values and handle editable value container
		if (
			maxTokensSlider &&
			temperatureSlider &&
			maxTokensValue &&
			temperatureValue
		) {
			maxTokensSlider.addEventListener("input", () =>
				updateSliderValue("maxTokens", "maxTokensValue")
			);
			temperatureSlider.addEventListener("input", () =>
				updateSliderValue("temperature", "temperatureValue")
			);

			maxTokensValue.addEventListener("blur", (event) =>
				handleEditableValueInput(event, "maxTokens", "maxTokensValue")
			);
			temperatureValue.addEventListener("blur", (event) =>
				handleEditableValueInput(event, "temperature", "temperatureValue")
			);
		}

		// update the slider values
		if (maxTokensSlider && temperatureSlider) {
			maxTokensSlider.addEventListener("input", () =>
				updateSliderValue("maxTokens", "maxTokensValue")
			);
			temperatureSlider.addEventListener("input", () =>
				updateSliderValue("temperature", "temperatureValue")
			);
		}

		// Prevent non-numeric input
		maxTokensValue.addEventListener("keydown", (event) =>
			handleNumericInput(event)
		);
		temperatureValue.addEventListener("keydown", (event) =>
			handleNumericInput(event)
		);

		// Remove any existing event listeners
		form.removeEventListener("submit", handleSubmit);

		// Add the event listener for the save button
		form.addEventListener("submit", handleSubmit);
	}

	function handleNumericInput(event) {
		// Allow backspace, delete, tab, escape, enter, and period
		if ([8, 9, 27, 13, 46, 190].includes(event.keyCode)) {
			return;
		}

		// Ensure that it's a number and stop the keypress if not
		if (
			(event.keyCode < 48 || event.keyCode > 57) &&
			(event.keyCode < 96 || event.keyCode > 105)
		) {
			event.preventDefault();
		}
	}

	function handleSubmit(event) {
		event.preventDefault();

		const apiKeyElement = document.getElementById("apiKey");
		if (!apiKeyElement) {
			return; // Bail if apiKeyElement is null
		}

		const apiKey = apiKeyElement.value;

		const modelElement = document.getElementById("model");
		const model = modelElement ? modelElement.value : "";

		const maxTokensElement = document.getElementById("maxTokensValue");
		const maxTokens = parseFloat(maxTokensElement.innerText);

		const temperatureElement = document.getElementById("temperatureValue");
		const temperature = parseFloat(temperatureElement.innerText);

		const apiKeyRegExpObj = new RegExp(apiKeyRegExp);
		const error = apiKeyRegExpObj.test(apiKey) ? "" : "invalidApiKey";

		const settings = { apiKey, model, maxTokens, temperature, error };

		vscodeApi.postMessage({ command: "saveSettings", ...settings });
	}

	document.addEventListener("DOMContentLoaded", initializeEventListeners);
})();
