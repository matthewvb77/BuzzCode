import { vscode, apiKeyRegExp } from "./configuration";

(function () {
	function updateSliderValue(sliderId: string, displayId: string) {
		const slider = document.getElementById(sliderId) as HTMLInputElement;
		const display = document.getElementById(displayId) as HTMLInputElement;

		if (slider && display) {
			display.innerText = slider.value;
		}
	}

	function updateSliderValueFromInput(sliderId: string, displayId: string) {
		const slider = document.getElementById(sliderId) as HTMLInputElement;
		const display = document.getElementById(displayId) as HTMLInputElement;

		if (slider && display) {
			slider.value = display.innerText;
		}
	}

	function handleEditableValueInput(
		event: FocusEvent,
		sliderId: string,
		displayId: string
	) {
		if (!event.target) {
			return;
		}
		const target = event.target as HTMLElement;

		const slider = document.getElementById(sliderId) as HTMLInputElement;
		const value = parseFloat(target.innerText);

		if (isNaN(value)) {
			target.innerText = slider.value;
		} else {
			slider.value = value.toString();
			updateSliderValue(sliderId, displayId);
		}
	}

	function initializeEventListeners() {
		const form = document.getElementById("settingsForm") as HTMLFormElement;
		const modelSelect = document.getElementById("model") as HTMLSelectElement;
		const maxTokensSlider = document.getElementById(
			"maxTokens"
		) as HTMLInputElement;
		const temperatureSlider = document.getElementById(
			"temperature"
		) as HTMLInputElement;
		const maxTokensValue = document.getElementById(
			"maxTokensValue"
		) as HTMLInputElement;
		const temperatureValue = document.getElementById(
			"temperatureValue"
		) as HTMLInputElement;

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

		// select the model that was saved
		if (modelSelect) {
			modelSelect.value = window.model;
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

	function handleNumericInput(event: KeyboardEvent) {
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

	function handleSubmit(event: Event) {
		event.preventDefault();

		const apiKeyElement = document.getElementById("apiKey") as HTMLInputElement; // Cast to HTMLInputElement
		if (!apiKeyElement) {
			return; // Bail if apiKeyElement is null
		}

		const apiKey = apiKeyElement.value;

		const modelElement = document.getElementById("model") as HTMLSelectElement; // Cast to HTMLSelectElement
		const model = modelElement ? modelElement.value : "";

		const maxTokensElement = document.getElementById(
			"maxTokensValue"
		) as HTMLElement; // Cast to HTMLElement
		const maxTokens = parseFloat(maxTokensElement.innerText);

		const temperatureElement = document.getElementById(
			"temperatureValue"
		) as HTMLElement; // Cast to HTMLElement
		const temperature = parseFloat(temperatureElement.innerText);

		const apiKeyRegExpObj = new RegExp(apiKeyRegExp);
		const error = apiKeyRegExpObj.test(apiKey) ? "" : "invalidApiKey";

		const settings = { apiKey, model, maxTokens, temperature, error };

		vscode.postMessage({ command: "saveSettings", ...settings });
	}

	document.addEventListener("DOMContentLoaded", initializeEventListeners);
})();
