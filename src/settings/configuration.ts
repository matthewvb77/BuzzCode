// SETTINGS - slider config
export const temperatureMax = 1;
export const temperatureMin = 0;
export const temperatureStep = 0.1;
export const temperaturePrecision = 1;
export const contextLengthGpt3Point5 = 4096;
export const contextLengthGpt4 = 8192;

// GENERAL - system details
export const shell = process.platform === "win32" ? "powershell.exe" : "bash";
export const shellArgs =
	process.platform === "win32" ? ["-NoLogo", "-NoExit"] : ["-i"];

export const delay = 5; // 5 ms delay between each command so stderr and stdout output in chronological order

// GENERAL - return message standards
export const RETURN_CANCELLED = "Cancelled";
export const ERROR_PREFIX = "Error: ";

// GENERAL - recursion config
export const RECURSION_LIMIT = 100;
