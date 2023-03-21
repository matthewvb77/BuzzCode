export const vscode = acquireVsCodeApi();

// api key validation
export const apiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";

// slider configuration
export const maxTokensMax = 1000;
export const maxTokensMin = 1;
export const temperatureMax = 1;
export const temperatureMin = 0;
export const temperatureStep = 0.1;
export const temperaturePrecision = 1;
