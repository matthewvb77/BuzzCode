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

	const apiKeyRegExp = new RegExp("^$|^sk-[a-zA-Z0-9]+$");

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
                padding: 8px 12px;
                margin: 8px 0;
                border-radius: 4px;
                outline: none;
              }
              #apiKey {
                width: 40%;
              }
              input[type="range"] {
                -webkit-appearance: none;
                width: 25%;
                padding: 0;
                margin: 12px 0;
              }
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 24px;
                height: 24px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
              }
              input[type="range"]::-moz-range-thumb {
                width: 24px;
                height: 24px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
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
              .input-container {
                position: relative;
              }
              .range-min,
              .range-max {
                font-size: 14px;
              }
              .range-min {
                
              }
              .range-max {
                
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
                display: inline-block;
                font-size: 18px;
                margin: 12px 0;
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
                    <div class="input-container">
                        <input type="text" id="apiKey" name="apiKey" value="${apiKey}">
                    </div>
                </div>
                <br>

                <div class="setting-container">
                      <label for="model">Model:</label>
                  <div class="input-container">
                      <select id="model" name="model">
                          <option value="text-davinci-003">text-davinci-003</option>
                          <option value="code-davinci-003">code-davinci-003</option>
                          <option value="text-davinci-005">text-davinci-005</option>
                      </select>
                  </div>
                </div>
                <br>
            
                <div class="setting-container">
                    <div class="value-container-parent">
                        <label class="value-container-child-title" for="maxTokens">Max Tokens:</label>
                        <span class="value-container-child-value" id="maxTokensValue">${maxTokens}</span>
                    </div>
                    <div class="input-container">
                        <span class="range-min">${maxTokensMin}</span>
                        <input type="range" id="maxTokens" name="maxTokens" min="${maxTokensMin}" max="${maxTokensMax}" value="${maxTokens}">
                        <span class="range-max">${maxTokensMax}</span>
                    </div>
                </div>
                <br>

                <div class="setting-container">
                    <div class="value-container-parent">
                        <label class="value-container-child-title" for="temperature">Temperature:</label>
                        <span class="value-container-child-value" id="temperatureValue">${Number(
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
                
                <button type="button" id="saveSettings">Save</button>
            </form>

            <script>
                function updateSliderValue(sliderId, displayId) {
                    const slider = document.getElementById(sliderId);
                    const display = document.getElementById(displayId);

                    if (slider && display) {
                        display.innerText = slider.value;
                    }
                }

                document.addEventListener('DOMContentLoaded', () => {
                    const modelSelect = document.getElementById('model');
                    const maxTokensSlider = document.getElementById('maxTokens');
                    const temperatureSlider = document.getElementById('temperature');
                    
                    // select the model that was saved
                    if (modelSelect) {
                        modelSelect.value = "${model}";
                    }

                    if (maxTokensSlider && temperatureSlider) {
                    maxTokensSlider.addEventListener('input', () => updateSliderValue('maxTokens', 'maxTokensValue'));
                    temperatureSlider.addEventListener('input', () => updateSliderValue('temperature', 'temperatureValue'));
                    }
                });

                // TODO: Fix save button not working after attempting to save an invalid API key
                document.getElementById("saveSettings").addEventListener("click", () => {
                    const vscode = acquireVsCodeApi();
                    let error = "";
                    const apiKey = document.getElementById('apiKey').value;
                    if (!${apiKeyRegExp}.test(apiKey)) {
                        error = "invalidApiKey";
                    }

                    const model = document.getElementById('model').value;
                    const maxTokens = document.getElementById('maxTokens').value;
                    const temperature = document.getElementById('temperature').value;

                    const settings = { apiKey, model, maxTokens, temperature, error };
                    
                    vscode.postMessage(settings);
                });
            </script>
        </body>
      </html>
    `;
}
