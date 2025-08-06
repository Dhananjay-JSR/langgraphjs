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
exports.isStudioAuthDisabled = exports.isAuthRegistered = void 0;
exports.authorize = authorize;
exports.authenticate = authenticate;
exports.registerAuth = registerAuth;
const http_exception_1 = require("hono/http-exception");
const url = __importStar(require("node:url"));
const path = __importStar(require("node:path"));
let CUSTOM_AUTH;
let DISABLE_STUDIO_AUTH = false;
const isAuthRegistered = () => CUSTOM_AUTH != null;
exports.isAuthRegistered = isAuthRegistered;
const isStudioAuthDisabled = () => DISABLE_STUDIO_AUTH;
exports.isStudioAuthDisabled = isStudioAuthDisabled;
function convertError(error) {
    const isHTTPAuthException = (error) => {
        return (typeof error === "object" &&
            error != null &&
            "status" in error &&
            "headers" in error);
    };
    if (isHTTPAuthException(error)) {
        throw new http_exception_1.HTTPException(error.status, {
            message: error.message,
            res: new Response(error.message || "Unauthorized", {
                status: error.status,
                headers: error.headers,
            }),
        });
    }
    throw error;
}
function authorize(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        // find filters and execute them
        const handlers = CUSTOM_AUTH === null || CUSTOM_AUTH === void 0 ? void 0 : CUSTOM_AUTH["~handlerCache"];
        if (!handlers)
            return { filters: undefined, value: payload.value };
        const cbKey = [
            `${payload.resource}:${payload.action}`,
            `${payload.resource}`,
            `*:${payload.action}`,
            `*`,
        ].find((priority) => { var _a; return (_a = handlers.callbacks) === null || _a === void 0 ? void 0 : _a[priority]; });
        const handler = cbKey ? (_a = handlers.callbacks) === null || _a === void 0 ? void 0 : _a[cbKey] : undefined;
        if (!handler || !payload.context) {
            return { filters: undefined, value: payload.value };
        }
        try {
            const result = yield handler({
                event: `${payload.resource}:${payload.action}`,
                resource: payload.resource,
                action: payload.action,
                value: payload.value,
                permissions: (_b = payload.context) === null || _b === void 0 ? void 0 : _b.scopes,
                user: (_c = payload.context) === null || _c === void 0 ? void 0 : _c.user,
            });
            if (result == null || result == true) {
                return { filters: undefined, value: payload.value };
            }
            if (result === false)
                throw new http_exception_1.HTTPException(403);
            if (typeof result !== "object") {
                throw new http_exception_1.HTTPException(500, {
                    message: `Auth handler returned invalid result. Expected filter object, null, undefined or boolean. Got "${typeof result}" instead.`,
                });
            }
            return { filters: result, value: payload.value };
        }
        catch (error) {
            throw convertError(error);
        }
    });
}
function authenticate(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const handlers = CUSTOM_AUTH === null || CUSTOM_AUTH === void 0 ? void 0 : CUSTOM_AUTH["~handlerCache"];
        if (!(handlers === null || handlers === void 0 ? void 0 : handlers.authenticate))
            return undefined;
        try {
            const response = yield handlers.authenticate(request);
            // normalize auth response
            const { scopes, user } = (() => {
                var _a, _b;
                if (typeof response === "string") {
                    return {
                        scopes: [],
                        user: {
                            permissions: [],
                            identity: response,
                            display_name: response,
                            is_authenticated: true,
                        },
                    };
                }
                if ("identity" in response && typeof response.identity === "string") {
                    const scopes = "permissions" in response && Array.isArray(response.permissions)
                        ? response.permissions
                        : [];
                    return {
                        scopes,
                        user: Object.assign(Object.assign({}, response), { permissions: scopes, is_authenticated: (_a = response.is_authenticated) !== null && _a !== void 0 ? _a : true, display_name: (_b = response.display_name) !== null && _b !== void 0 ? _b : response.identity }),
                    };
                }
                throw new Error("Invalid auth response received. Make sure to either return a `string` or an object with `identity` property.");
            })();
            return { scopes, user };
        }
        catch (error) {
            throw convertError(error);
        }
    });
}
function registerAuth(auth, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!auth.path)
            return;
        // TODO: handle options.auth.disable_studio_auth
        const [userFile, exportSymbol] = auth.path.split(":", 2);
        const sourceFile = path.resolve(options.cwd, userFile);
        const module = (yield Promise.resolve(`${url.pathToFileURL(sourceFile).toString()}`).then(s => __importStar(require(s))).then((module) => module[exportSymbol || "default"]));
        if (!module)
            throw new Error(`Failed to load auth: ${auth.path}`);
        if (!("~handlerCache" in module))
            throw new Error(`Auth must be an instance of Auth: ${auth.path}`);
        CUSTOM_AUTH = module;
        DISABLE_STUDIO_AUTH = (_a = auth.disable_studio_auth) !== null && _a !== void 0 ? _a : false;
    });
}
