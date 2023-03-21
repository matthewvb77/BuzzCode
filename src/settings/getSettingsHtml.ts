import { Uri } from "vscode";

export function getSettingsHtml(
	apiKey: string,
	model: string,
	maxTokens: number,
	temperature: number,
	cspSource: string,
	tooltipPNG: Uri,
	scriptUri: Uri,
	styleUri: Uri
): string {
	// slider configuration
	const maxTokensMax = 1000;
	const maxTokensMin = 1;
	const temperatureMax = 1;
	const temperatureMin = 0;
	const temperatureStep = 0.1;
	const temperaturePrecision = 1;

	return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; script-src ${cspSource}; style-src ${cspSource};">
            <link rel="stylesheet" type="text/css" href="${styleUri}">
        </head>
        <body>
            <form id="settingsForm">

                <div class="setting-container">
                  <div class="tooltip">
                    <img src="${tooltipPNG}" alt="Tooltip Icon"/>
                    <span class="tooltiptext">You can get your API key from <a href="https://platform.openai.com/account/api-keys" >OpenAI</a></span>
                  </div>
                  <label for="apiKey">API Key:</label>
                  <input type="text" id="apiKey" name="apiKey" value="${apiKey}" maxlength="75" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                </div>
                <br>

                <div class="setting-container">
                    <div class="tooltip">
                      <img src="${tooltipPNG}" alt="Tooltip Icon"/>
                      <span class="tooltiptext">You can specify which model TestWise uses. Codex has been deprecated by OpenAI</span>
                    </div>
                    <label for="model">Model:</label>
                    <select id="model" name="model">
                        <option value="gpt-4" disabled="true">GPT-4 - Not yet supported</option>
                        <option value="gpt-3.5-turbo">GPT-3.5-Turbo</option>
                    </select>
                </div>
                <br>
            
                <div class="setting-container">
                    <div class="value-container-parent">
                        <div class="tooltip">
                        <img src="${tooltipPNG}" alt="Tooltip Icon"/>
                        <span class="tooltiptext">You can specify the maximum number of tokens that TestWise will generate. One token is 3-4 characters. </span>
                        </div>
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
                        <div class="tooltip">
                          <img src="${tooltipPNG}" alt="Tooltip Icon"/>
                          <span class="tooltiptext">Higher temperatures will result in more creative responses, but also more mistakes.</span>
                        </div>
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

            <script src="${scriptUri}"></script>
        </body>
      </html>
    `;
}
