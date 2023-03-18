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
            /* Add your custom styles here */
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
