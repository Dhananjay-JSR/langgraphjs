"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticGraphSchema = getStaticGraphSchema;
exports.getRuntimeGraphSchema = getRuntimeGraphSchema;
const node_worker_threads_1 = require("node:worker_threads");
const node_path_1 = require("node:path");
const isGraphSpec = (spec) => {
    if (typeof spec !== "object" || spec == null)
        return false;
    if (!("sourceFile" in spec) || typeof spec.sourceFile !== "string")
        return false;
    if (!("exportSymbol" in spec) || typeof spec.exportSymbol !== "string")
        return false;
    return true;
};
function getStaticGraphSchema(input, options) {
    return __awaiter(this, void 0, void 0, function* () {
        function execute(specs) {
            return __awaiter(this, void 0, void 0, function* () {
                if (options === null || options === void 0 ? void 0 : options.mainThread) {
                    const { SubgraphExtractor } = yield Promise.resolve().then(() => __importStar(require("./parser")));
                    return SubgraphExtractor.extractSchemas(specs, { strict: false });
                }
                return yield new Promise((resolve, reject) => {
                    var _a;
                    const worker = new node_worker_threads_1.Worker((0, node_path_1.join)(__dirname, "./parser.worker.mjs"), { argv: process.argv.slice(-1) });
                    // Set a timeout to reject if the worker takes too long
                    const timeoutId = setTimeout(() => {
                        worker.terminate();
                        reject(new Error("Schema extract worker timed out"));
                    }, (_a = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _a !== void 0 ? _a : 30000);
                    worker.on("message", (result) => {
                        worker.terminate();
                        clearTimeout(timeoutId);
                        resolve(result);
                    });
                    worker.on("error", reject);
                    worker.postMessage(specs);
                });
            });
        }
        const specs = isGraphSpec(input) ? [input] : Object.values(input);
        const results = yield execute(specs);
        if (isGraphSpec(input)) {
            return results[0];
        }
        return Object.fromEntries(Object.keys(input).map((graphId, idx) => [graphId, results[idx]]));
    });
}
function getRuntimeGraphSchema(graph) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { getInputTypeSchema, getOutputTypeSchema, getUpdateTypeSchema, getConfigTypeSchema, } = yield Promise.resolve().then(() => __importStar(require("@langchain/langgraph/zod/schema")));
            const result = {
                state: getUpdateTypeSchema(graph),
                input: getInputTypeSchema(graph),
                output: getOutputTypeSchema(graph),
                config: getConfigTypeSchema(graph),
            };
            if (Object.values(result).every((i) => i == null))
                return undefined;
            return result;
        }
        catch (_a) {
            // ignore
        }
        return undefined;
    });
}
