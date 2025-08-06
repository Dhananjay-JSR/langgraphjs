"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeError = exports.serialiseAsDict = void 0;
const serialiseAsDict = (obj) => {
    return JSON.stringify(obj, function (key, value) {
        const rawValue = this[key];
        if (rawValue != null &&
            typeof rawValue === "object" &&
            "toDict" in rawValue &&
            typeof rawValue.toDict === "function") {
            // TODO: we need to upstream this to LangChainJS
            const { type, data } = rawValue.toDict();
            return Object.assign(Object.assign({}, data), { type });
        }
        return value;
    }, 2);
};
exports.serialiseAsDict = serialiseAsDict;
const serializeError = (error) => {
    if (error instanceof Error) {
        return { error: error.name, message: error.message };
    }
    return { error: "Error", message: JSON.stringify(error) };
};
exports.serializeError = serializeError;
