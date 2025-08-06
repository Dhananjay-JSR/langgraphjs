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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureContentType = exports.cors = void 0;
const cors_1 = require("hono/cors");
const cors = (cors) => {
    var _a, _b;
    if (cors == null) {
        return (0, cors_1.cors)({
            origin: "*",
            exposeHeaders: ["content-location", "x-pagination-total"],
        });
    }
    const originRegex = cors.allow_origin_regex
        ? new RegExp(cors.allow_origin_regex)
        : undefined;
    const origin = originRegex
        ? (origin) => {
            originRegex.lastIndex = 0; // reset regex in case it's a global regex
            if (originRegex.test(origin))
                return origin;
            return undefined;
        }
        : (_a = cors.allow_origins) !== null && _a !== void 0 ? _a : [];
    if ((_b = cors.expose_headers) === null || _b === void 0 ? void 0 : _b.length) {
        const headersSet = new Set(cors.expose_headers.map((h) => h.toLowerCase()));
        if (!headersSet.has("content-location")) {
            console.warn("Adding missing `Content-Location` header in `cors.expose_headers`.");
            cors.expose_headers.push("content-location");
        }
        if (!headersSet.has("x-pagination-total")) {
            console.warn("Adding missing `X-Pagination-Total` header in `cors.expose_headers`.");
            cors.expose_headers.push("x-pagination-total");
        }
    }
    // TODO: handle `cors.allow_credentials`
    return (0, cors_1.cors)({
        origin,
        maxAge: cors.max_age,
        allowMethods: cors.allow_methods,
        allowHeaders: cors.allow_headers,
        credentials: cors.allow_credentials,
        exposeHeaders: cors.expose_headers,
    });
};
exports.cors = cors;
// This is used to match the behavior of the original LangGraph API
// where the content-type is not being validated. Might be nice
// to warn about this in the future and throw an error instead.
const ensureContentType = () => {
    return (c, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (((_a = c.req.header("content-type")) === null || _a === void 0 ? void 0 : _a.startsWith("text/plain")) &&
            c.req.method !== "GET" &&
            c.req.method !== "OPTIONS") {
            c.req.raw.headers.set("content-type", "application/json");
        }
        yield next();
    });
};
exports.ensureContentType = ensureContentType;
