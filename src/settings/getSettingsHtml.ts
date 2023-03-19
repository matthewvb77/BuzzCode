export function getSettingsHtml(
	apiKey: string,
	maxTokens: number,
	temperature: number
) {
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
                margin: 20px;
            }
            label {
                font-size: 14px;
            }
            input[type="text"], input[type="range"] {
                background-color: #3c3c3c;
                border: 1px solid #3c3c3c;
                color: #c8c8c8;
                font-size: 14px;
                padding: 4px 8px;
                margin: 4px 0;
                border-radius: 3px;
            }
            #apiKey {
                width: 20%;
            }
            input[type="range"] {
                -webkit-appearance: none;
                width: 20%;
                padding: 0;
                margin: 8px 0;
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
            }
            input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background-color: #569cd6;
                cursor: pointer;
                border-radius: 50%;
            }
            button {
                background-color: #569cd6;
                border: none;
                color: white;
                padding: 6px 12px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 14px;
                margin: 8px 0;
                cursor: pointer;
                border-radius: 3px;
            }
            button:hover {
                background-color: #4080b6;
            }
        </style>
        </head>
        <body>
            <form id="settingsForm">
                <label for="apiKey">API Key:</label>
                <input type="text" id="apiKey" name="apiKey" value="${apiKey}">
                <br>
                <label for="maxTokens">Max Tokens:</label>
                <input type="range" id="maxTokens" name="maxTokens" min="1" max="1000" value="${maxTokens}">
                <span id="maxTokensValue">${maxTokens}</span>
                <br>
                <label for="temperature">Temperature:</label>
                <input type="range" id="temperature" name="temperature" min="0" max="1" step="0.1" value="${temperature}">
                <span id="temperatureValue">${Number(temperature).toFixed(
									1
								)}</span>
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
                    const maxTokensSlider = document.getElementById('maxTokens');
                    const temperatureSlider = document.getElementById('temperature');
          
                    if (maxTokensSlider && temperatureSlider) {
                      maxTokensSlider.addEventListener('input', () => updateSliderValue('maxTokens', 'maxTokensValue'));
                      temperatureSlider.addEventListener('input', () => updateSliderValue('temperature', 'temperatureValue'));
                    }
                });

                document.getElementById("saveSettings").addEventListener("click", () => {
                    const apiKey = document.getElementById('apiKey').value;
                    const maxTokens = document.getElementById('maxTokens').value;
                    const temperature = document.getElementById('temperature').value;

                    const settings = { apiKey, maxTokens, temperature };
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage(settings);
                });
            </script>
        </body>
      </html>
    `;
}
