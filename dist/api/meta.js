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
const hono_1 = require("hono");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
// import * as url from "node:url";
const api = new hono_1.Hono();
// Get the version using the same pattern as semver/index.mts
const packageJsonPath = path.resolve(__dirname, "../../../../package.json");
let version;
let langgraph_js_version;
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packageJsonContent = yield fs.readFile(packageJsonPath, "utf-8");
        const packageJson = JSON.parse(packageJsonContent);
        version = packageJson.version;
    }
    catch (_a) {
        console.warn("Could not determine version of langgraph-api");
    }
}))();
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get the installed version of @langchain/langgraph
    try {
        const langgraphPkg = yield Promise.resolve().then(() => __importStar(require("@langchain/langgraph/package.json")));
        if ((_a = langgraphPkg === null || langgraphPkg === void 0 ? void 0 : langgraphPkg.default) === null || _a === void 0 ? void 0 : _a.version) {
            langgraph_js_version = langgraphPkg.default.version;
        }
    }
    catch (_b) {
        console.warn("Could not determine version of @langchain/langgraph");
    }
}))();
// read env variable
const env = process.env;
api.get("/info", (c) => {
    const langsmithApiKey = env["LANGSMITH_API_KEY"] || env["LANGCHAIN_API_KEY"];
    const langsmithTracing = (() => {
        if (langsmithApiKey) {
            // Check if any tracing variable is explicitly set to "false"
            const tracingVars = [
                env["LANGCHAIN_TRACING_V2"],
                env["LANGCHAIN_TRACING"],
                env["LANGSMITH_TRACING_V2"],
                env["LANGSMITH_TRACING"],
            ];
            // Return true unless explicitly disabled
            return !tracingVars.some((val) => val === "false" || val === "False");
        }
        return undefined;
    })();
    return c.json({
        version,
        langgraph_js_version,
        context: "js",
        flags: {
            assistants: true,
            crons: false,
            langsmith: !!langsmithTracing,
            langsmith_tracing_replicas: true,
        },
    });
});
api.get("/ok", (c) => c.json({ ok: true }));
exports.default = api;
