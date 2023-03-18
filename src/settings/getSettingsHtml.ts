export function getSettingsHtml() {
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
            <input type="text" id="apiKey" name="apiKey">
            <br>
            <label for="maxTokens">Max Tokens:</label>
            <input type="number" id="maxTokens" name="maxTokens" min="1">
            <br>
            <label for="temperature">Temperature:</label>
            <input type="number" id="temperature" name="temperature" min="0" step="0.01">
            <br>
            <button type="button" id="saveSettings">Save</button>
          </form>
          <script>
            document.getElementById('saveSettings').addEventListener('click', () => {
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
