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
const zod_validator_1 = require("@hono/zod-validator");
const schemas = __importStar(require("../schemas"));
const http_exception_1 = require("hono/http-exception");
const store_1 = require("../storage/store");
const custom_1 = require("../auth/custom");
const api = new hono_1.Hono();
const validateNamespace = (namespace) => {
    if (!namespace || namespace.length === 0) {
        throw new http_exception_1.HTTPException(400, { message: "Namespace is required" });
    }
    for (const label of namespace) {
        if (!label || label.includes(".")) {
            throw new http_exception_1.HTTPException(422, {
                message: "Namespace labels cannot be empty or contain periods. Received: " +
                    namespace.join("."),
            });
        }
    }
};
const mapItemsToApi = (item) => {
    if (item == null)
        return null;
    const clonedItem = Object.assign({}, item);
    delete clonedItem.createdAt;
    delete clonedItem.updatedAt;
    clonedItem.created_at = item.createdAt;
    clonedItem.updated_at = item.updatedAt;
    return clonedItem;
};
api.post("/store/namespaces", (0, zod_validator_1.zValidator)("json", schemas.StoreListNamespaces), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // List Namespaces
    const payload = c.req.valid("json");
    if (payload.prefix)
        validateNamespace(payload.prefix);
    if (payload.suffix)
        validateNamespace(payload.suffix);
    yield (0, custom_1.handleAuthEvent)(c.var.auth, "store:list_namespaces", {
        namespace: payload.prefix,
        suffix: payload.suffix,
        max_depth: payload.max_depth,
        limit: payload.limit,
        offset: payload.offset,
    });
    return c.json({
        namespaces: yield store_1.store.listNamespaces({
            limit: (_a = payload.limit) !== null && _a !== void 0 ? _a : 100,
            offset: (_b = payload.offset) !== null && _b !== void 0 ? _b : 0,
            prefix: payload.prefix,
            suffix: payload.suffix,
            maxDepth: payload.max_depth,
        }),
    });
}));
api.post("/store/items/search", (0, zod_validator_1.zValidator)("json", schemas.StoreSearchItems), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Search Items
    const payload = c.req.valid("json");
    if (payload.namespace_prefix)
        validateNamespace(payload.namespace_prefix);
    yield (0, custom_1.handleAuthEvent)(c.var.auth, "store:search", {
        namespace: payload.namespace_prefix,
        filter: payload.filter,
        limit: payload.limit,
        offset: payload.offset,
        query: payload.query,
    });
    const items = yield store_1.store.search(payload.namespace_prefix, {
        filter: payload.filter,
        limit: (_a = payload.limit) !== null && _a !== void 0 ? _a : 10,
        offset: (_b = payload.offset) !== null && _b !== void 0 ? _b : 0,
        query: payload.query,
    });
    return c.json({ items: items.map(mapItemsToApi) });
}));
api.put("/store/items", (0, zod_validator_1.zValidator)("json", schemas.StorePutItem), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Put Item
    const payload = c.req.valid("json");
    if (payload.namespace)
        validateNamespace(payload.namespace);
    yield (0, custom_1.handleAuthEvent)(c.var.auth, "store:put", {
        namespace: payload.namespace,
        key: payload.key,
        value: payload.value,
    });
    yield store_1.store.put(payload.namespace, payload.key, payload.value);
    return c.body(null, 204);
}));
api.delete("/store/items", (0, zod_validator_1.zValidator)("json", schemas.StoreDeleteItem), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Delete Item
    const payload = c.req.valid("json");
    if (payload.namespace)
        validateNamespace(payload.namespace);
    yield (0, custom_1.handleAuthEvent)(c.var.auth, "store:delete", {
        namespace: payload.namespace,
        key: payload.key,
    });
    yield store_1.store.delete((_a = payload.namespace) !== null && _a !== void 0 ? _a : [], payload.key);
    return c.body(null, 204);
}));
api.get("/store/items", (0, zod_validator_1.zValidator)("query", schemas.StoreGetItem), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Item
    const payload = c.req.valid("query");
    yield (0, custom_1.handleAuthEvent)(c.var.auth, "store:get", {
        namespace: payload.namespace,
        key: payload.key,
    });
    const key = payload.key;
    const namespace = payload.namespace;
    return c.json(mapItemsToApi(yield store_1.store.get(namespace, key)));
}));
exports.default = api;
