"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineAbortSignals = void 0;
const combineAbortSignals = (...input) => {
    const signals = input.filter((item) => item != null);
    if ("any" in AbortSignal)
        return AbortSignal.any(signals);
    const abortController = new AbortController();
    signals.forEach((signal) => signal.addEventListener("abort", () => abortController.abort()));
    return abortController.signal;
};
exports.combineAbortSignals = combineAbortSignals;
