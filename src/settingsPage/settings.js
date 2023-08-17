(function () {
	const openaiApiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";

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
		const temperatureSlider = document.getElementById("temperature");
		const temperatureValue = document.getElementById("temperatureValue");
		const continuousMode = document.getElementById("continuousMode");

		// update the slider values and handle editable value container
		if (temperatureSlider && temperatureValue && continuousMode) {
			temperatureSlider.addEventListener("input", () =>
				updateSliderValue("temperature", "temperatureValue")
			);

			temperatureValue.addEventListener("blur", (event) =>
				handleEditableValueInput(event, "temperature", "temperatureValue")
			);

			continuousMode.addEventListener("change", (event) => {
				if (event.target.checked) {
					vscode.postMessage({
						command: "showWarning",
						text: "This will disable ALL WARNINGS. Use with caution. Are you sure you want to do this?",
					});
				}
			});

			window.addEventListener("message", (event) => {
				const message = event.data;

				switch (message.command) {
					case "warningResponse":
						if (message.response === "Yes") {
							continuousMode.checked = true;
						} else {
							continuousMode.checked = false;
						}
						break;

					default:
						throw new Error(`Unknown message: ${message.command}`);
				}
			});
		}

		// Prevent non-numeric input
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

		const openaiApiKeyElement = document.getElementById("openaiApiKey");
		if (!openaiApiKeyElement) {
			return; // Bail if openaiApiKeyElement is null
		}

		const openaiApiKey = openaiApiKeyElement.value;

		const modelElement = document.getElementById("model");
		const model = modelElement.value;

		const temperatureElement = document.getElementById("temperatureValue");
		const temperature = parseFloat(temperatureElement.innerText);

		const continuousModeElement = document.getElementById("continuousMode");
		const continuousMode = continuousModeElement.checked;

		const openaiApiKeyRegExpObj = new RegExp(openaiApiKeyRegExp);
		const error = openaiApiKeyRegExpObj.test(openaiApiKey)
			? ""
			: "invalidOpenaiApiKey";

		const settings = {
			openaiApiKey,
			model,
			temperature,
			continuousMode,
			error,
		};

		vscode.postMessage({ command: "saveSettings", ...settings });
	}

	document.addEventListener("DOMContentLoaded", initializeEventListeners);
})();
