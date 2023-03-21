export function getSettingsHtml(
	apiKey: string,
	model: string,
	maxTokens: number,
	temperature: number
) {
	// slider configuration
	const maxTokensMax = 1000;
	const maxTokensMin = 1;
	const temperatureMax = 1;
	const temperatureMin = 0;
	const temperatureStep = 0.1;
	const temperaturePrecision = 1;

	const apiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";

	return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
            body {
                background-color: #1e1e1e;
                color: #c8c8c8;
                font-family: 'Roboto', sans-serif;
                margin: 20px;
                font-size: 18px;
                display: flex;
                flex-direction: column;
                height: calc(100vh - 40px);
              }
              label {
                font-size: 18px;
                font-weight: 700;
              }
              input[type="text"], input[type="range"], select {
                background-color: #3c3c3c;
                border: 1px solid #3c3c3c;
                color: #c8c8c8;
                font-size: 18px;
                padding: 6px 12px;
                margin: 8px 0;
                border-radius: 4px;
                outline: none;
              }
              span[contenteditable="true"] {
                background-color: #3c3c3c;
                border: 1px solid #3c3c3c;
                color: #c8c8c8;
                font-size: 18px;
                border-radius: 4px;
                outline: none;
              }
              #apiKey {
                width: 40%;
              }
              input[type="range"] {
                -webkit-appearance: none;
                padding: 0;
                width: 25%;
                margin: 12px 0px;
                margin-top: 20px;
              }
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 24px;
                height: 24px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
                margin-top: -10.5px;
              }
              input[type="range"]::-moz-range-thumb {
                width: 24px;
                height: 24px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
              }
              input[type="range"]::-webkit-slider-runnable-track {
                height: 5px;
                background-color: #5a5a5a;
              }
              input[type="range"]::-moz-range-track {
                height: 3px;
                background-color: #5a5a5a;
              }
              .value-container-parent {
              }
              .value-container-child-title {
                  display: inline-block;
              }
              .value-container-child-value {
                  display: inline-block;
                  background-color: #3c3c3c;
                  padding: 4px 8px;
              }
              .range-min,
              .range-max {
                font-size: 14px;
                padding: 6px;
              }
              .setting-container {
                padding: 4px;
              }
              .setting {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              button {
                background-color: #569cd6;
                border: none;
                color: white;
                padding: 12px 24px;
                text-align: center;
                text-decoration: none;
                font-size: 18px;
                margin: 12px 0px;
                cursor: pointer;
                border-radius: 4px;
                align-self: flex-end;
              }
              button:hover {
                background-color: #4080b6;
              }
            </style>
        </head>
        <body>
            <form id="settingsForm">

                <div class="setting-container">
                    <label for="apiKey">API Key:</label>
                    <input type="text" id="apiKey" name="apiKey" value="${apiKey}" maxlength="75" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                </div>
                <br>

                <div class="setting-container">
                    <label for="model">Model:</label>
                    <select id="model" name="model">
                          <option value="gpt-4" disabled="true">GPT-4 - Not yet supported</option>
                          <option value="gpt-3.5-turbo">GPT-3.5-Turbo</option>
                    </select>
                </div>
                <br>
            
                <div class="setting-container">
                    <div class="value-container-parent">
                        <label class="value-container-child-title" for="maxTokens">Max Tokens:</label>
                        <span class="value-container-child-value" id="maxTokensValue" contenteditable="true">${maxTokens}</span>
                    </div>
                    <span class="range-min">${maxTokensMin}</span>
                    <input type="range" id="maxTokens" name="maxTokens" min="${maxTokensMin}" max="${maxTokensMax}" value="${maxTokens}">
                    <span class="range-max">${maxTokensMax}</span>
                </div>
                <br>

                <div class="setting-container">
                    <div class="value-container-parent">
                        <label class="value-container-child-title" for="temperature">Temperature:</label>
                        <span class="value-container-child-value" id="temperatureValue" contenteditable="true">${Number(
													temperature
												).toFixed(temperaturePrecision)}</span>
                    </div>
                    <div class="input-container">
                        <span class="range-min">${temperatureMin}</span>
                        <input type="range" id="temperature" name="temperature" min="${temperatureMin}" max="${temperatureMax}" step="${temperatureStep}" value="${temperature}">
                        <span class="range-max">${temperatureMax}</span>
                    </div>
                </div>
                <br>
                
                <button type="submit" id="saveSettings">Save</button>
            </form>

            <script>
                const vscode = acquireVsCodeApi();
            
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
                    const slider = document.getElementById(sliderId);
                    const value = parseFloat(event.target.innerText);

                    if (isNaN(value)) {
                      event.target.innerText = slider.value;
                    } else {
                      slider.value = value;
                      updateSliderValue(sliderId, displayId);
                    }
                }

                function initializeEventListeners() {
                  const form = document.getElementById('settingsForm');
                  const modelSelect = document.getElementById('model');
                  const maxTokensSlider = document.getElementById('maxTokens');
                  const temperatureSlider = document.getElementById('temperature');
                  const maxTokensValue = document.getElementById('maxTokensValue');
                  const temperatureValue = document.getElementById('temperatureValue');

                  // update the slider values and handle editable value container
                  if (maxTokensSlider && temperatureSlider && maxTokensValue && temperatureValue) {
                    maxTokensSlider.addEventListener('input', () => updateSliderValue('maxTokens', 'maxTokensValue'));
                    temperatureSlider.addEventListener('input', () => updateSliderValue('temperature', 'temperatureValue'));
                
                    maxTokensValue.addEventListener('blur', (event) => handleEditableValueInput(event, 'maxTokens', 'maxTokensValue'));
                    temperatureValue.addEventListener('blur', (event) => handleEditableValueInput(event, 'temperature', 'temperatureValue'));
                  }
 
                  // select the model that was saved
                  if (modelSelect) {
                      modelSelect.value = "${model}";
                  }
      
                  // update the slider values
                  if (maxTokensSlider && temperatureSlider) {
                    maxTokensSlider.addEventListener('input', () => updateSliderValue('maxTokens', 'maxTokensValue'));
                    temperatureSlider.addEventListener('input', () => updateSliderValue('temperature', 'temperatureValue'));
                  }

                  // Prevent non-numeric input
                  maxTokensValue.addEventListener('keydown', (event) => handleNumericInput(event));
                  temperatureValue.addEventListener('keydown', (event) => handleNumericInput(event));
      
                  // Remove any existing event listeners
                  form.removeEventListener('submit', handleSubmit);
      
                  // Add the event listener for the save button
                  form.addEventListener('submit', handleSubmit);
                }

                function handleNumericInput(event) {
                    // Allow backspace, delete, tab, escape, enter, and period
                    if ([8, 9, 27, 13, 46, 190].includes(event.keyCode)) {
                        return;
                    }
                
                    // Ensure that it's a number and stop the keypress if not
                    if ((event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
                        event.preventDefault();
                    }
                }

                function handleSubmit(event) {
                    event.preventDefault();
                    let error = '';
                    const apiKey = document.getElementById('apiKey').value;

                    const apiKeyRegExpObj = new RegExp(\`${apiKeyRegExp}\`);
                    if (!apiKeyRegExpObj.test(apiKey)) {
                      error = 'invalidApiKey';
                    }
            
                    const model = document.getElementById('model').value;
                    const maxTokens = document.getElementById('maxTokensValue').innerText;
                    const temperature = document.getElementById('temperatureValue').innerText;
            
                    const settings = { apiKey, model, maxTokens, temperature, error };
                    
                    vscode.postMessage({ command: 'saveSettings', ...settings });
                }

                document.addEventListener('DOMContentLoaded', initializeEventListeners);

            </script>
        </body>
      </html>
    `;
}
