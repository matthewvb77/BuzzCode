"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.temperaturePrecision = exports.temperatureStep = exports.temperatureMin = exports.temperatureMax = exports.maxTokensMin = exports.maxTokensMax = exports.apiKeyRegExp = void 0;
// api key validation
exports.apiKeyRegExp = "^$|^sk-[a-zA-Z0-9]+$";
// slider configuration
exports.maxTokensMax = 1000;
exports.maxTokensMin = 1;
exports.temperatureMax = 1;
exports.temperatureMin = 0;
exports.temperatureStep = 0.1;
exports.temperaturePrecision = 1;
