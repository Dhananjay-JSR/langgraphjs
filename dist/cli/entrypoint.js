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
const exit_hook_1 = require("exit-hook");
const process = __importStar(require("node:process"));
const server_1 = require("../server");
const client_1 = require("./utils/ipc/client");
const langsmith_1 = require("langsmith");
const logging_1 = require("../logging");
logging_1.logger.info(`Starting server...`);
(() => __awaiter(void 0, void 0, void 0, function* () {
    const [ppid, payload] = process.argv.slice(-2);
    const sendToParent = yield (0, client_1.connectToServer)(+ppid);
    // TODO: re-export langsmith/isTracingEnabled
    const isTracingEnabled = () => {
        var _a, _b, _c, _d;
        const value = ((_a = process.env) === null || _a === void 0 ? void 0 : _a.LANGSMITH_TRACING_V2) ||
            ((_b = process.env) === null || _b === void 0 ? void 0 : _b.LANGCHAIN_TRACING_V2) ||
            ((_c = process.env) === null || _c === void 0 ? void 0 : _c.LANGSMITH_TRACING) ||
            ((_d = process.env) === null || _d === void 0 ? void 0 : _d.LANGCHAIN_TRACING);
        return value === "true";
    };
    const options = server_1.StartServerSchema.parse(JSON.parse(payload));
    // Export PORT to the environment
    process.env.PORT = options.port.toString();
    const [{ host, cleanup }, organizationId] = yield Promise.all([
        (0, server_1.startServer)(options),
        (() => __awaiter(void 0, void 0, void 0, function* () {
            if (isTracingEnabled()) {
                try {
                    // @ts-expect-error Private method
                    return yield new langsmith_1.Client()._getTenantId();
                }
                catch (error) {
                    logging_1.logger.warn("Failed to get organization ID. Tracing to LangSmith will not work.", { error });
                }
            }
            return null;
        }))(),
    ]);
    logging_1.logger.info(`Server running at ${host}`);
    let queryParams = `?baseUrl=http://${options.host}:${options.port}`;
    if (organizationId)
        queryParams += `&organizationId=${organizationId}`;
    (0, exit_hook_1.asyncExitHook)(cleanup, { wait: 3000 });
    sendToParent === null || sendToParent === void 0 ? void 0 : sendToParent({ queryParams });
}))();
