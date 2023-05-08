// slider configuration
export const maxTokensMax = 4000;
export const maxTokensMin = 1;
export const temperatureMax = 1;
export const temperatureMin = 0;
export const temperatureStep = 0.1;
export const temperaturePrecision = 1;

export const shell = process.platform === "win32" ? "powershell.exe" : "bash";
export const shellArgs =
	process.platform === "win32" ? ["-NoLogo", "-NoExit"] : ["-i"];
