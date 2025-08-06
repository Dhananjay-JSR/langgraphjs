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
exports.registerAuth = exports.auth = exports.handleAuthEvent = void 0;
exports.isAuthMatching = isAuthMatching;
const index_1 = require("./index");
function isAuthMatching(metadata, filters) {
    if (filters == null)
        return true;
    for (const [key, value] of Object.entries(filters)) {
        if (typeof value === "object" && value != null) {
            if (value.$eq) {
                if ((metadata === null || metadata === void 0 ? void 0 : metadata[key]) !== value.$eq)
                    return false;
            }
            else if (value.$contains) {
                if (!Array.isArray(metadata === null || metadata === void 0 ? void 0 : metadata[key]) ||
                    !(metadata === null || metadata === void 0 ? void 0 : metadata[key].includes(value.$contains))) {
                    return false;
                }
            }
        }
        else {
            if ((metadata === null || metadata === void 0 ? void 0 : metadata[key]) !== value)
                return false;
        }
    }
    return true;
}
const handleAuthEvent = (context, event, value) => __awaiter(void 0, void 0, void 0, function* () {
    const [resource, action] = event.split(":");
    const result = yield (0, index_1.authorize)({
        resource,
        action,
        context,
        value,
    });
    return [result.filters, result.value];
});
exports.handleAuthEvent = handleAuthEvent;
const STUDIO_USER = {
    kind: "StudioUser",
    display_name: "langgraph-studio-user",
    identity: "langgraph-studio-user",
    permissions: [],
    is_authenticated: true,
};
const auth = () => {
    return (c, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(0, index_1.isAuthRegistered)())
            return next();
        // skip for /info
        if (c.req.path === "/info")
            return next();
        if (!(0, index_1.isStudioAuthDisabled)() &&
            c.req.header("x-auth-scheme") === "langsmith") {
            c.set("auth", {
                user: STUDIO_USER,
                scopes: STUDIO_USER.permissions.slice(),
            });
            return next();
        }
        const auth = yield (0, index_1.authenticate)(c.req.raw);
        c.set("auth", auth);
        return next();
    });
};
exports.auth = auth;
var index_2 = require("./index");
Object.defineProperty(exports, "registerAuth", { enumerable: true, get: function () { return index_2.registerAuth; } });
