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
const schemas = __importStar(require("../schemas"));
const state_1 = require("../state");
const ops_1 = require("../storage/ops");
const hono_2 = require("../utils/hono");
const api = new hono_1.Hono();
// Threads Routes
api.post("/threads", (0, zod_validator_1.zValidator)("json", schemas.ThreadCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Create Thread
    const payload = c.req.valid("json");
    const thread = yield ops_1.Threads.put(payload.thread_id || (0, uuid_1.v4)(), { metadata: payload.metadata, if_exists: (_a = payload.if_exists) !== null && _a !== void 0 ? _a : "raise" }, c.var.auth);
    if ((_b = payload.supersteps) === null || _b === void 0 ? void 0 : _b.length) {
        yield ops_1.Threads.State.bulk({ configurable: { thread_id: thread.thread_id } }, payload.supersteps, c.var.auth);
    }
    return (0, hono_2.jsonExtra)(c, thread);
}));
api.post("/threads/search", (0, zod_validator_1.zValidator)("json", schemas.ThreadSearchRequest), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e, _f, _g;
    // Search Threads
    const payload = c.req.valid("json");
    const result = [];
    let total = 0;
    try {
        for (var _h = true, _j = __asyncValues(ops_1.Threads.search({
            status: payload.status,
            values: payload.values,
            metadata: payload.metadata,
            limit: (_d = payload.limit) !== null && _d !== void 0 ? _d : 10,
            offset: (_e = payload.offset) !== null && _e !== void 0 ? _e : 0,
            sort_by: (_f = payload.sort_by) !== null && _f !== void 0 ? _f : "created_at",
            sort_order: (_g = payload.sort_order) !== null && _g !== void 0 ? _g : "desc",
        }, c.var.auth)), _k; _k = yield _j.next(), _a = _k.done, !_a; _h = true) {
            _c = _k.value;
            _h = false;
            const item = _c;
            result.push(Object.assign(Object.assign({}, item.thread), { created_at: item.thread.created_at.toISOString(), updated_at: item.thread.updated_at.toISOString() }));
            // Only set total if it's the first item
            if (total === 0) {
                total = item.total;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_h && !_a && (_b = _j.return)) yield _b.call(_j);
        }
        finally { if (e_1) throw e_1.error; }
    }
    c.res.headers.set("X-Pagination-Total", total.toString());
    return (0, hono_2.jsonExtra)(c, result);
}));
api.get("/threads/:thread_id/state", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ subgraphs: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Latest Thread State
    const { thread_id } = c.req.valid("param");
    const { subgraphs } = c.req.valid("query");
    const state = (0, state_1.stateSnapshotToThreadState)(yield ops_1.Threads.State.get({ configurable: { thread_id } }, { subgraphs }, c.var.auth));
    return (0, hono_2.jsonExtra)(c, state);
}));
api.post("/threads/:thread_id/state", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", zod_1.z.object({
    values: zod_1.z
        .union([
        zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())),
    ])
        .nullish(),
    as_node: zod_1.z.string().optional(),
    checkpoint_id: zod_1.z.string().optional(),
    checkpoint: schemas.CheckpointSchema.nullish(),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Update Thread State
    const { thread_id } = c.req.valid("param");
    const payload = c.req.valid("json");
    const config = { configurable: { thread_id } };
    if (payload.checkpoint_id) {
        (_a = config.configurable) !== null && _a !== void 0 ? _a : (config.configurable = {});
        config.configurable.checkpoint_id = payload.checkpoint_id;
    }
    if (payload.checkpoint) {
        (_b = config.configurable) !== null && _b !== void 0 ? _b : (config.configurable = {});
        Object.assign(config.configurable, payload.checkpoint);
    }
    const inserted = yield ops_1.Threads.State.post(config, payload.values, payload.as_node, c.var.auth);
    return (0, hono_2.jsonExtra)(c, inserted);
}));
api.get("/threads/:thread_id/state/:checkpoint_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({
    thread_id: zod_1.z.string().uuid(),
    checkpoint_id: zod_1.z.string().uuid(),
})), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ subgraphs: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Thread State At Checkpoint
    const { thread_id, checkpoint_id } = c.req.valid("param");
    const { subgraphs } = c.req.valid("query");
    const state = (0, state_1.stateSnapshotToThreadState)(yield ops_1.Threads.State.get({ configurable: { thread_id, checkpoint_id } }, { subgraphs }, c.var.auth));
    return (0, hono_2.jsonExtra)(c, state);
}));
api.post("/threads/:thread_id/state/checkpoint", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", zod_1.z.object({
    subgraphs: schemas.coercedBoolean.optional(),
    checkpoint: schemas.CheckpointSchema.nullish(),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Thread State At Checkpoint Post
    const { thread_id } = c.req.valid("param");
    const { checkpoint, subgraphs } = c.req.valid("json");
    const state = (0, state_1.stateSnapshotToThreadState)(yield ops_1.Threads.State.get({ configurable: Object.assign({ thread_id }, checkpoint) }, { subgraphs }, c.var.auth));
    return (0, hono_2.jsonExtra)(c, state);
}));
api.get("/threads/:thread_id/history", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({
    limit: zod_1.z
        .string()
        .optional()
        .default("10")
        .transform((value) => parseInt(value, 10)),
    before: zod_1.z.string().optional(),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Thread History
    const { thread_id } = c.req.valid("param");
    const { limit, before } = c.req.valid("query");
    const states = yield ops_1.Threads.State.list({ configurable: { thread_id, checkpoint_ns: "" } }, { limit, before }, c.var.auth);
    return (0, hono_2.jsonExtra)(c, states.map(state_1.stateSnapshotToThreadState));
}));
api.post("/threads/:thread_id/history", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.ThreadHistoryRequest), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Thread History Post
    const { thread_id } = c.req.valid("param");
    const { limit, before, metadata, checkpoint } = c.req.valid("json");
    const states = yield ops_1.Threads.State.list({ configurable: Object.assign({ thread_id, checkpoint_ns: "" }, checkpoint) }, { limit, before, metadata }, c.var.auth);
    return (0, hono_2.jsonExtra)(c, states.map(state_1.stateSnapshotToThreadState));
}));
api.get("/threads/:thread_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Get Thread
    const { thread_id } = c.req.valid("param");
    return (0, hono_2.jsonExtra)(c, yield ops_1.Threads.get(thread_id, c.var.auth));
}));
api.delete("/threads/:thread_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Delete Thread
    const { thread_id } = c.req.valid("param");
    yield ops_1.Threads.delete(thread_id, c.var.auth);
    return new Response(null, { status: 204 });
}));
api.patch("/threads/:thread_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.ThreadPatchRequest), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Patch Thread
    const { thread_id } = c.req.valid("param");
    const { metadata } = c.req.valid("json");
    return (0, hono_2.jsonExtra)(c, yield ops_1.Threads.patch(thread_id, { metadata }, c.var.auth));
}));
api.post("/threads/:thread_id/copy", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Copy Thread
    const { thread_id } = c.req.valid("param");
    return (0, hono_2.jsonExtra)(c, yield ops_1.Threads.copy(thread_id, c.var.auth));
}));
exports.default = api;
