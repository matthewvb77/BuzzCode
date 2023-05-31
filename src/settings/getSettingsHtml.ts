import { Uri } from "vscode";
import {
	temperatureMin,
	temperatureMax,
	temperaturePrecision,
	temperatureStep,
} from "./configuration";
import { getNonce } from "../helpers/getNonce";

export function getSettingsHtml(
	openaiApiKey: string,
	model: string,
	temperature: number,
	continuousMode: boolean,
	cspSource: string,
	scriptUri: Uri,
	styleUri: Uri,
	codiconUri: Uri
): string {
	const nonce = getNonce();
	return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src ${cspSource}; script-src ${cspSource} 'nonce-${nonce}';">
            <link rel="stylesheet" type="text/css" href="${styleUri}">
            <link rel="stylesheet" href="${codiconUri}">
        </head>
        <body>
            <form id="settingsForm">

                <div class="setting-container">
                  <div class="tooltip">
                    <span class="tooltip tooltip-info"></span>
                    <span class="tooltiptext">You can get your API key from <a href="https://platform.openai.com/account/api-keys" >OpenAI</a></span>
                  </div>
                  <label for="openaiApiKey">OpenAI API Key:</label>
                  <input type="password" id="openaiApiKey" name="openaiApiKey" value="${openaiApiKey}" maxlength="75" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                </div>
                <br>

                <div class="setting-container">
                    <div class="tooltip">
                        <span class="tooltip tooltip-info"></span>
                        <span class="tooltiptext">Which OpenAI model BuzzCode uses</span>
                    </div>
                    <label for="model">Model:</label>
                    <select id="model" name="model">
                        <option value="gpt-4" ${
													model === "gpt-4" ? "selected" : ""
												}>GPT 4 (Smart)</option>
                        <option value="gpt-3.5-turbo" ${
													model === "gpt-3.5-turbo" ? "selected" : ""
												}>GPT 3.5 Turbo (Fast)</option>
                    </select>
                </div>
                <br>

                <div class="setting-container">
                    <div class="value-container-parent">
                        <div class="tooltip">
                            <span class="tooltip-info"></span>
                            <span class="tooltiptext">Higher temperatures will result in more creative responses, but also more mistakes</span>
                        </div>
                        <label class="value-container-child-title" for="temperature">Temperature:</label>
                        <span class="value-container-child-value" id="temperatureValue" contenteditable="true">${Number(
													temperature
												).toFixed(temperaturePrecision)}</span>
                        <span class="default">RECOMMENDED: 0.2</span>
                    </div>
                    <div class="input-container">
                        <span class="range-min">${temperatureMin}</span>
                        <input type="range" id="temperature" name="temperature" min="${temperatureMin}" max="${temperatureMax}" step="${temperatureStep}" value="${temperature}">
                        <span class="range-max">${temperatureMax}</span>
                    </div>
                </div>
                <br>

                <div class="setting-container">
                    <div class="inline-align">
                        <div class="tooltip">
                            <span class="tooltip tooltip-warning"></span>
                            <span class="tooltiptext">Disables ALL WARNINGS. Use at own risk.</span>
                        </div>
                        <label for="continuousMode">Continuous Mode:</label>
                        <label class="switch">
                            <input type="checkbox" id="continuousMode" name="continuousMode" ${
															continuousMode ? "checked" : ""
														}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
                <br>

                <button type="submit" id="saveSettings">Save</button>
            </form>
            <script nonce="${nonce}">
                var vscode = acquireVsCodeApi();
            </script>
            <script src="${scriptUri}"></script>
        </body>
      </html>
    `;
}
