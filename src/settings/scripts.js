(function () {
	const apiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";

	function updateSliderValue(sliderId, displayId) {
		const slider = document.getElementById(sliderId);
		const display = document.getElementById(displayId);

		if (slider && display) {
			display.innerText = slider.value;
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

		// Prevent non-numeric input
		maxTokensValue.addEventListener("keydown", (event) =>
			handleNumericInput(event, "maxTokens", "maxTokensValue")
		);
		temperatureValue.addEventListener("keydown", (event) =>
			handleNumericInput(event, "temperature", "temperatureValue")
		);

		form.removeEventListener("submit", handleSubmit);
		form.addEventListener("submit", handleSubmit);
	}

	function handleNumericInput(event, sliderId, displayId) {
		// Allow backspace, delete, tab, escape, enter, period, left arrow, and right arrow
		if ([8, 9, 27, 13, 46, 190, 37, 39].includes(event.keyCode)) {
			// Update the slider value when the enter key is pressed
			if (event.keyCode === 13) {
				event.preventDefault();
				handleEditableValueInput(event, sliderId, displayId);
			}
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

		vscode.postMessage({ command: "saveSettings", ...settings });
	}

	document.addEventListener("DOMContentLoaded", initializeEventListeners);
})();
