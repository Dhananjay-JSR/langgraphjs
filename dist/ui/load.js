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
exports.api = void 0;
exports.registerGraphUi = registerGraphUi;
const zod_1 = require("zod");
const hono_1 = require("hono");
const mime_1 = require("hono/utils/mime");
const zod_validator_1 = require("@hono/zod-validator");
const path = __importStar(require("node:path"));
const GRAPH_UI = {};
// Wrapper function to handle ESM import
function getLangGraphUI() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Use dynamic import to avoid ESM/CommonJS compatibility issues
            const langgraphUi = yield Promise.resolve().then(() => __importStar(require("@langchain/langgraph-ui")));
            return langgraphUi;
        }
        catch (error) {
            console.error("Failed to import @langchain/langgraph-ui:", error);
            throw error;
        }
    });
}
function registerGraphUi(defs, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const langgraphUi = yield getLangGraphUI();
        yield langgraphUi.watch({
            defs,
            cwd: options.cwd,
            config: options.config,
            onOutput: (graphId, files) => (GRAPH_UI[graphId] = files),
        });
    });
}
exports.api = new hono_1.Hono();
exports.api.post("/ui/:agent", (0, zod_validator_1.zValidator)("json", zod_1.z.object({ name: zod_1.z.string() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    const agent = c.req.param("agent");
    const host = c.req.header("host");
    const message = yield c.req.valid("json");
    const files = GRAPH_UI[agent];
    if (!(files === null || files === void 0 ? void 0 : files.length))
        return c.text(`UI not found for agent "${agent}"`, 404);
    const messageName = JSON.stringify(message.name);
    const result = [];
    for (const css of files.filter((i) => path.extname(i.basename) === ".css")) {
        result.push(`<link rel="stylesheet" href="http://${host}/ui/${agent}/${css.basename}" />`);
    }
    const stableName = agent.replace(/[^a-zA-Z0-9]/g, "_");
    const js = files.find((i) => path.extname(i.basename) === ".js");
    if (js) {
        result.push(`<script src="http://${host}/ui/${agent}/${js.basename}" onload='__LGUI_${stableName}.render(${messageName}, "{{shadowRootId}}")'></script>`);
    }
    return c.text(result.join("\n"), {
        headers: { "Content-Type": "text/html" },
    });
}));
exports.api.get("/ui/:agent/:basename", (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const agent = c.req.param("agent");
    const basename = c.req.param("basename");
    const file = (_a = GRAPH_UI[agent]) === null || _a === void 0 ? void 0 : _a.find((item) => item.basename === basename);
    if (!file)
        return c.text("File not found", 404);
    return c.body(file.contents, {
        headers: { "Content-Type": (_b = (0, mime_1.getMimeType)(file.basename)) !== null && _b !== void 0 ? _b : "text/plain" },
    });
}));
