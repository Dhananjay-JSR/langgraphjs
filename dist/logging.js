"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logError = exports.logger = void 0;
exports.registerSdkLogger = registerSdkLogger;
exports.registerRuntimeLogFormatter = registerRuntimeLogFormatter;
const winston_1 = require("winston");
const logger_1 = require("hono/logger");
const winston_console_format_1 = require("winston-console-format");
const stacktrace_parser_1 = require("stacktrace-parser");
const node_fs_1 = require("node:fs");
const code_frame_1 = require("@babel/code-frame");
const node_path_1 = __importDefault(require("node:path"));
const LOG_JSON = process.env.LOG_JSON === "true";
const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
let RUNTIME_LOG_FORMATTER;
const applyRuntimeFormatter = (0, winston_1.format)((info) => {
    if (!RUNTIME_LOG_FORMATTER)
        return info;
    return RUNTIME_LOG_FORMATTER(info);
});
exports.logger = (0, winston_1.createLogger)({
    level: LOG_LEVEL,
    format: winston_1.format.combine(applyRuntimeFormatter(), winston_1.format.errors({ stack: true }), winston_1.format.timestamp(), winston_1.format.json(), ...(!LOG_JSON
        ? [
            winston_1.format.colorize({ all: true }),
            winston_1.format.padLevels(),
            (0, winston_console_format_1.consoleFormat)({
                showMeta: true,
                metaStrip: ["timestamp"],
                inspectOptions: {
                    depth: Infinity,
                    colors: true,
                    maxArrayLength: Infinity,
                    breakLength: 120,
                    compact: Infinity,
                },
            }),
        ]
        : [
            winston_1.format.printf((info) => {
                const { timestamp, level, message } = info, rest = __rest(info, ["timestamp", "level", "message"]);
                let event;
                if (typeof message === "string") {
                    event = message;
                }
                else {
                    event = JSON.stringify(message);
                }
                if (rest.stack) {
                    rest.message = event;
                    event = rest.stack;
                }
                return JSON.stringify(Object.assign({ timestamp, level, event }, rest));
            }),
        ])),
    transports: [new winston_1.transports.Console()],
});
// Expose the logger to be consumed by `getLogger`
function registerSdkLogger() {
    const GLOBAL_LOGGER = Symbol.for("langgraph.api.sdk-logger");
    const maybeGlobal = globalThis;
    maybeGlobal[GLOBAL_LOGGER] = exports.logger;
}
function registerRuntimeLogFormatter(formatter) {
    return __awaiter(this, void 0, void 0, function* () {
        RUNTIME_LOG_FORMATTER = formatter;
    });
}
const formatStack = (stack) => {
    var _a;
    if (!stack)
        return stack;
    const [firstFile] = (0, stacktrace_parser_1.parse)(stack).filter((item) => {
        var _a, _b;
        return !((_a = item.file) === null || _a === void 0 ? void 0 : _a.split(node_path_1.default.sep).includes("node_modules")) &&
            !((_b = item.file) === null || _b === void 0 ? void 0 : _b.startsWith("node:"));
    });
    if ((firstFile === null || firstFile === void 0 ? void 0 : firstFile.file) && (firstFile === null || firstFile === void 0 ? void 0 : firstFile.lineNumber)) {
        try {
            const filePath = firstFile.file;
            const line = firstFile.lineNumber;
            const column = (_a = firstFile.column) !== null && _a !== void 0 ? _a : 0;
            const messageLines = stack.split("\n");
            const spliceIndex = messageLines.findIndex((i) => i.includes(filePath));
            const padding = " ".repeat(Math.max(0, messageLines[spliceIndex].indexOf("at")));
            const highlightCode = process.stdout.isTTY;
            let codeFrame = (0, code_frame_1.codeFrameColumns)((0, node_fs_1.readFileSync)(filePath, "utf-8"), { start: { line, column } }, { highlightCode });
            codeFrame = codeFrame
                .split("\n")
                .map((i) => padding + i + "\x1b[0m")
                .join("\n");
            if (highlightCode) {
                codeFrame = "\x1b[36m" + codeFrame + "\x1b[31m";
            }
            // insert codeframe after the line but dont lose the stack
            return [
                ...messageLines.slice(0, spliceIndex + 1),
                codeFrame,
                ...messageLines.slice(spliceIndex + 1),
            ].join("\n");
        }
        catch (_b) {
            // pass
        }
    }
    return stack;
};
const logError = (error, options) => {
    let message;
    let context = options === null || options === void 0 ? void 0 : options.context;
    if (error instanceof Error) {
        message = formatStack(error.stack) || error.message;
    }
    else {
        message = String(error);
        context = Object.assign(Object.assign({}, context), { error });
    }
    if ((options === null || options === void 0 ? void 0 : options.prefix) != null)
        message = `${options.prefix}:\n${message}`;
    exports.logger.error(message, ...(context != null ? [context] : []));
};
exports.logError = logError;
process.on("uncaughtException", (error) => (0, exports.logError)(error));
process.on("unhandledRejection", (error) => (0, exports.logError)(error));
const requestLogger = () => (0, logger_1.logger)((message, ...rest) => {
    exports.logger.info(message, ...rest);
});
exports.requestLogger = requestLogger;
