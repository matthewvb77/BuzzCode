"use strict";
var __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			function (t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (var p in s)
						if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			};
		return __assign.apply(this, arguments);
	};
exports.__esModule = true;
var configuration_1 = require("./configuration");
(function () {
	var vscodeApi;
	window.addEventListener("message", function (event) {
		var message = event.data; // The json data that the extension sent
		if (message.command === "vsCodeApi") {
			vscodeApi = message.data;
		}
	});
	window.postMessage({ command: "getVsCodeApi" }, "*");
	function updateSliderValue(sliderId, displayId) {
		var slider = document.getElementById(sliderId);
		var display = document.getElementById(displayId);
		if (slider && display) {
			display.innerText = slider.value;
		}
	}
	// function updateSliderValueFromInput(sliderId: string, displayId: string) {
	// 	const slider = document.getElementById(sliderId) as HTMLInputElement;
	// 	const display = document.getElementById(displayId) as HTMLInputElement;
	// 	if (slider && display) {
	// 		slider.value = display.innerText;
	// 	}
	// }
	function handleEditableValueInput(event, sliderId, displayId) {
		if (!event.target) {
			return;
		}
		var target = event.target;
		var slider = document.getElementById(sliderId);
		var value = parseFloat(target.innerText);
		if (isNaN(value)) {
			target.innerText = slider.value;
		} else {
			slider.value = value.toString();
			updateSliderValue(sliderId, displayId);
		}
	}
	function initializeEventListeners() {
		var form = document.getElementById("settingsForm");
		var modelSelect = document.getElementById("model");
		var maxTokensSlider = document.getElementById("maxTokens");
		var temperatureSlider = document.getElementById("temperature");
		var maxTokensValue = document.getElementById("maxTokensValue");
		var temperatureValue = document.getElementById("temperatureValue");
		// update the slider values and handle editable value container
		if (
			maxTokensSlider &&
			temperatureSlider &&
			maxTokensValue &&
			temperatureValue
		) {
			maxTokensSlider.addEventListener("input", function () {
				return updateSliderValue("maxTokens", "maxTokensValue");
			});
			temperatureSlider.addEventListener("input", function () {
				return updateSliderValue("temperature", "temperatureValue");
			});
			maxTokensValue.addEventListener("blur", function (event) {
				return handleEditableValueInput(event, "maxTokens", "maxTokensValue");
			});
			temperatureValue.addEventListener("blur", function (event) {
				return handleEditableValueInput(
					event,
					"temperature",
					"temperatureValue"
				);
			});
		}
		// update the slider values
		if (maxTokensSlider && temperatureSlider) {
			maxTokensSlider.addEventListener("input", function () {
				return updateSliderValue("maxTokens", "maxTokensValue");
			});
			temperatureSlider.addEventListener("input", function () {
				return updateSliderValue("temperature", "temperatureValue");
			});
		}
		// Prevent non-numeric input
		maxTokensValue.addEventListener("keydown", function (event) {
			return handleNumericInput(event);
		});
		temperatureValue.addEventListener("keydown", function (event) {
			return handleNumericInput(event);
		});
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
		var apiKeyElement = document.getElementById("apiKey");
		if (!apiKeyElement) {
			return; // Bail if apiKeyElement is null
		}
		var apiKey = apiKeyElement.value;
		var modelElement = document.getElementById("model");
		var model = modelElement ? modelElement.value : "";
		var maxTokensElement = document.getElementById("maxTokensValue");
		var maxTokens = parseFloat(maxTokensElement.innerText);
		var temperatureElement = document.getElementById("temperatureValue");
		var temperature = parseFloat(temperatureElement.innerText);
		var apiKeyRegExpObj = new RegExp(configuration_1.apiKeyRegExp);
		var error = apiKeyRegExpObj.test(apiKey) ? "" : "invalidApiKey";
		var settings = {
			apiKey: apiKey,
			model: model,
			maxTokens: maxTokens,
			temperature: temperature,
			error: error,
		};
		vscodeApi.postMessage(__assign({ command: "saveSettings" }, settings));
	}
	document.addEventListener("DOMContentLoaded", initializeEventListeners);
})();
