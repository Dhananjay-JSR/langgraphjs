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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_validator_1 = require("@hono/zod-validator");
const hono_1 = require("hono");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const load_1 = require("../graph/load");
const index_1 = require("../graph/parser/index");
const http_exception_1 = require("hono/http-exception");
const schemas = __importStar(require("../schemas"));
const ops_1 = require("../storage/ops");
const api = new hono_1.Hono();
const RunnableConfigSchema = zod_1.z.object({
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    run_name: zod_1.z.string().optional(),
    max_concurrency: zod_1.z.number().optional(),
    recursion_limit: zod_1.z.number().optional(),
    configurable: zod_1.z.record(zod_1.z.unknown()).optional(),
    run_id: zod_1.z.string().uuid().optional(),
});
const getRunnableConfig = (userConfig) => {
    if (!userConfig)
        return {};
    return {
        configurable: userConfig.configurable,
        tags: userConfig.tags,
        metadata: userConfig.metadata,
        runName: userConfig.run_name,
        maxConcurrency: userConfig.max_concurrency,
        recursionLimit: userConfig.recursion_limit,
        runId: userConfig.run_id,
    };
};
api.post("/assistants", (0, zod_validator_1.zValidator)("json", schemas.AssistantCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    // Create Assistant
    const payload = c.req.valid("json");
    const assistant = yield ops_1.Assistants.put((_a = payload.assistant_id) !== null && _a !== void 0 ? _a : (0, uuid_1.v4)(), {
        config: (_b = payload.config) !== null && _b !== void 0 ? _b : {},
        context: (_c = payload.context) !== null && _c !== void 0 ? _c : {},
        graph_id: payload.graph_id,
        metadata: (_d = payload.metadata) !== null && _d !== void 0 ? _d : {},
        if_exists: (_e = payload.if_exists) !== null && _e !== void 0 ? _e : "raise",
        name: (_f = payload.name) !== null && _f !== void 0 ? _f : "Untitled",
    }, c.var.auth);
    return c.json(assistant);
}));
api.post("/assistants/search", (0, zod_validator_1.zValidator)("json", schemas.AssistantSearchRequest), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e;
    // Search Assistants
    const payload = c.req.valid("json");
    const result = [];
    let total = 0;
    try {
        for (var _f = true, _g = __asyncValues(ops_1.Assistants.search({
            graph_id: payload.graph_id,
            metadata: payload.metadata,
            limit: (_d = payload.limit) !== null && _d !== void 0 ? _d : 10,
            offset: (_e = payload.offset) !== null && _e !== void 0 ? _e : 0,
        }, c.var.auth)), _h; _h = yield _g.next(), _a = _h.done, !_a; _f = true) {
            _c = _h.value;
            _f = false;
            const item = _c;
            result.push(item.assistant);
            if (total === 0) {
                total = item.total;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_f && !_a && (_b = _g.return)) yield _b.call(_g);
        }
        finally { if (e_1) throw e_1.error; }
    }
    c.res.headers.set("X-Pagination-Total", total.toString());
    return c.json(result);
}));
api.get("/assistants/:assistant_id", (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Assistant
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    return c.json(yield ops_1.Assistants.get(assistantId, c.var.auth));
}));
api.delete("/assistants/:assistant_id", (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Delete Assistant
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    return c.json(yield ops_1.Assistants.delete(assistantId, c.var.auth));
}));
api.patch("/assistants/:assistant_id", (0, zod_validator_1.zValidator)("json", schemas.AssistantPatch), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Patch Assistant
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    const payload = c.req.valid("json");
    return c.json(yield ops_1.Assistants.patch(assistantId, payload, c.var.auth));
}));
api.get("/assistants/:assistant_id/graph", (0, zod_validator_1.zValidator)("query", zod_1.z.object({ xray: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Assistant Graph
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    const assistant = yield ops_1.Assistants.get(assistantId, c.var.auth);
    const { xray } = c.req.valid("query");
    const config = getRunnableConfig(assistant.config);
    const graph = yield (0, load_1.getGraph)(assistant.graph_id, config);
    const drawable = yield graph.getGraphAsync(Object.assign(Object.assign({}, config), { xray: xray !== null && xray !== void 0 ? xray : undefined }));
    return c.json(drawable.toJSON());
}));
api.get("/assistants/:assistant_id/schemas", (0, zod_validator_1.zValidator)("json", zod_1.z.object({ config: RunnableConfigSchema.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Assistant Schemas
    const json = c.req.valid("json");
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    const assistant = yield ops_1.Assistants.get(assistantId, c.var.auth);
    const config = getRunnableConfig(json.config);
    const graph = yield (0, load_1.getGraph)(assistant.graph_id, config);
    const schema = yield (() => __awaiter(void 0, void 0, void 0, function* () {
        const runtimeSchema = yield (0, index_1.getRuntimeGraphSchema)(graph);
        if (runtimeSchema)
            return runtimeSchema;
        const graphSchema = yield (0, load_1.getCachedStaticGraphSchema)(assistant.graph_id);
        const rootGraphId = Object.keys(graphSchema).find((i) => !i.includes("|"));
        if (!rootGraphId)
            throw new http_exception_1.HTTPException(404, { message: "Failed to find root graph" });
        return graphSchema[rootGraphId];
    }))();
    return c.json({
        graph_id: assistant.graph_id,
        input_schema: schema.input,
        output_schema: schema.output,
        state_schema: schema.state,
        config_schema: schema.config,
        // From JS PoV `configSchema` and `contextSchema` are indistinguishable,
        // thus we use config_schema for context_schema.
        context_schema: schema.config,
    });
}));
api.get("/assistants/:assistant_id/subgraphs/:namespace?", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ assistant_id: zod_1.z.string(), namespace: zod_1.z.string().optional() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ recurse: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_2, _b, _c;
    // Get Assistant Subgraphs
    const { assistant_id, namespace } = c.req.valid("param");
    const { recurse } = c.req.valid("query");
    const assistantId = (0, load_1.getAssistantId)(assistant_id);
    const assistant = yield ops_1.Assistants.get(assistantId, c.var.auth);
    const config = getRunnableConfig(assistant.config);
    const graph = yield (0, load_1.getGraph)(assistant.graph_id, config);
    const result = [];
    const subgraphsGenerator = "getSubgraphsAsync" in graph
        ? graph.getSubgraphsAsync.bind(graph)
        : graph.getSubgraphs.bind(graph);
    let graphSchemaPromise;
    try {
        for (var _d = true, _e = __asyncValues(subgraphsGenerator(namespace, recurse)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const [ns, subgraph] = _c;
            const schema = yield (() => __awaiter(void 0, void 0, void 0, function* () {
                const runtimeSchema = yield (0, index_1.getRuntimeGraphSchema)(subgraph);
                if (runtimeSchema)
                    return runtimeSchema;
                graphSchemaPromise !== null && graphSchemaPromise !== void 0 ? graphSchemaPromise : (graphSchemaPromise = (0, load_1.getCachedStaticGraphSchema)(assistant.graph_id));
                const graphSchema = yield graphSchemaPromise;
                const rootGraphId = Object.keys(graphSchema).find((i) => !i.includes("|"));
                if (!rootGraphId) {
                    throw new http_exception_1.HTTPException(404, {
                        message: "Failed to find root graph",
                    });
                }
                return graphSchema[`${rootGraphId}|${ns}`] || graphSchema[rootGraphId];
            }))();
            result.push([ns, schema]);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return c.json(Object.fromEntries(result));
}));
api.post("/assistants/:assistant_id/latest", (0, zod_validator_1.zValidator)("json", schemas.AssistantLatestVersion), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Set Latest Assistant Version
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    const { version } = c.req.valid("json");
    return c.json(yield ops_1.Assistants.setLatest(assistantId, version, c.var.auth));
}));
api.post("/assistants/:assistant_id/versions", (0, zod_validator_1.zValidator)("json", zod_1.z.object({
    limit: zod_1.z.number().min(1).max(1000).optional().default(10),
    offset: zod_1.z.number().min(0).optional().default(0),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Assistant Versions
    const assistantId = (0, load_1.getAssistantId)(c.req.param("assistant_id"));
    const { limit, offset, metadata } = c.req.valid("json");
    const versions = yield ops_1.Assistants.getVersions(assistantId, { limit, offset, metadata }, c.var.auth);
    if (!(versions === null || versions === void 0 ? void 0 : versions.length)) {
        throw new http_exception_1.HTTPException(404, {
            message: `Assistant "${assistantId}" not found.`,
        });
    }
    return c.json(versions);
}));
exports.default = api;
