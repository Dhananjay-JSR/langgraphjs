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
exports.createEmbedServer = createEmbedServer;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const streaming_1 = require("hono/streaming");
const uuid_1 = require("uuid");
const schemas = __importStar(require("../schemas"));
const zod_1 = require("zod");
const stream_1 = require("../stream");
const serde_1 = require("../utils/serde");
const hono_2 = require("../utils/hono");
const state_1 = require("../state");
const middleware_1 = require("../http/middleware");
function createStubRun(threadId, payload) {
    var _a, _b, _c;
    const now = new Date();
    const runId = (0, uuid_1.v4)();
    const streamMode = Array.isArray(payload.stream_mode)
        ? payload.stream_mode
        : payload.stream_mode
            ? [payload.stream_mode]
            : undefined;
    const config = Object.assign({}, (_a = payload.config) !== null && _a !== void 0 ? _a : {}, {
        configurable: Object.assign(Object.assign(Object.assign({ run_id: runId, thread_id: threadId, graph_id: payload.assistant_id }, (payload.checkpoint_id
            ? { checkpoint_id: payload.checkpoint_id }
            : null)), payload.checkpoint), (payload.langsmith_tracer
            ? {
                langsmith_project: payload.langsmith_tracer.project_name,
                langsmith_example_id: payload.langsmith_tracer.example_id,
            }
            : null)),
    }, { metadata: (_b = payload.metadata) !== null && _b !== void 0 ? _b : {} });
    return {
        run_id: runId,
        thread_id: threadId,
        assistant_id: payload.assistant_id,
        metadata: (_c = payload.metadata) !== null && _c !== void 0 ? _c : {},
        status: "running",
        kwargs: {
            input: payload.input,
            command: payload.command,
            config,
            stream_mode: streamMode,
            interrupt_before: payload.interrupt_before,
            interrupt_after: payload.interrupt_after,
            feedback_keys: payload.feedback_keys,
            subgraphs: payload.stream_subgraphs,
            temporary: false,
        },
        multitask_strategy: "reject",
        created_at: now,
        updated_at: now,
    };
}
/**
 * Attach LangGraph Platform-esque routes to a given Hono instance.
 * @experimental Does not follow semver.
 */
function createEmbedServer(options) {
    function getGraph(graphId) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetGraph = options.graph[graphId];
            targetGraph.store = options.store;
            targetGraph.checkpointer = options.checkpointer;
            return targetGraph;
        });
    }
    const api = new hono_1.Hono();
    api.use((0, middleware_1.ensureContentType)());
    api.post("/threads", (0, zod_validator_1.zValidator)("json", schemas.ThreadCreate), (c) => __awaiter(this, void 0, void 0, function* () {
        // create a new threaad
        const payload = c.req.valid("json");
        const threadId = payload.thread_id || (0, uuid_1.v4)();
        yield options.threads.put(threadId, payload);
        return (0, hono_2.jsonExtra)(c, { thread_id: threadId });
    }));
    api.get("/threads/:thread_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (c) => __awaiter(this, void 0, void 0, function* () {
        // Get Thread
        const { thread_id } = c.req.valid("param");
        const thread = yield options.threads.get(thread_id);
        return (0, hono_2.jsonExtra)(c, thread);
    }));
    api.delete("/threads/:thread_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (c) => __awaiter(this, void 0, void 0, function* () {
        const { thread_id } = c.req.valid("param");
        yield options.threads.delete(thread_id);
        return new Response(null, { status: 204 });
    }));
    api.get("/threads/:thread_id/state", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ subgraphs: schemas.coercedBoolean.optional() })), (c) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Get Latest Thread State
        const { thread_id } = c.req.valid("param");
        const { subgraphs } = c.req.valid("query");
        const thread = yield options.threads.get(thread_id);
        const graphId = (_a = thread.metadata) === null || _a === void 0 ? void 0 : _a.graph_id;
        const graph = graphId ? yield getGraph(graphId) : undefined;
        if (graph == null) {
            return (0, hono_2.jsonExtra)(c, (0, state_1.stateSnapshotToThreadState)({
                values: {},
                next: [],
                config: {},
                metadata: undefined,
                createdAt: undefined,
                parentConfig: undefined,
                tasks: [],
            }));
        }
        const config = { configurable: { thread_id } };
        const result = yield graph.getState(config, { subgraphs });
        return (0, hono_2.jsonExtra)(c, (0, state_1.stateSnapshotToThreadState)(result));
    }));
    api.post("/threads/:thread_id/history", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.ThreadHistoryRequest), (c) => __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d;
        // Get Thread History Post
        const { thread_id } = c.req.valid("param");
        const { limit, before, metadata, checkpoint } = c.req.valid("json");
        const thread = yield options.threads.get(thread_id);
        const graphId = (_d = thread.metadata) === null || _d === void 0 ? void 0 : _d.graph_id;
        const graph = graphId ? yield getGraph(graphId) : undefined;
        if (graph == null)
            return (0, hono_2.jsonExtra)(c, []);
        const config = { configurable: Object.assign({ thread_id }, checkpoint) };
        const result = [];
        const beforeConfig = typeof before === "string"
            ? { configurable: { checkpoint_id: before } }
            : before;
        try {
            for (var _e = true, _f = __asyncValues(graph.getStateHistory(config, {
                limit,
                before: beforeConfig,
                filter: metadata,
            })), _g; _g = yield _f.next(), _a = _g.done, !_a; _e = true) {
                _c = _g.value;
                _e = false;
                const state = _c;
                result.push((0, state_1.stateSnapshotToThreadState)(state));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = _f.return)) yield _b.call(_f);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return (0, hono_2.jsonExtra)(c, result);
    }));
    api.post("/threads/:thread_id/runs/stream", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(this, void 0, void 0, function* () {
        // Stream Run
        return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(this, void 0, void 0, function* () {
            var _a, e_2, _b, _c;
            const { thread_id } = c.req.valid("param");
            const payload = c.req.valid("json");
            const signal = (0, hono_2.getDisconnectAbortSignal)(c, stream);
            const run = createStubRun(thread_id, payload);
            // update thread with new graph_id
            const thread = yield options.threads.get(thread_id);
            yield options.threads.put(thread_id, {
                metadata: Object.assign(Object.assign({}, thread.metadata), { graph_id: payload.assistant_id, assistant_id: payload.assistant_id }),
            });
            try {
                for (var _d = true, _e = __asyncValues((0, stream_1.streamState)(run, {
                    attempt: 1,
                    getGraph,
                    signal,
                })), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const { event, data } = _c;
                    yield stream.writeSSE({ data: (0, serde_1.serialiseAsDict)(data), event });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }));
    }));
    api.post("/runs/stream", (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(this, void 0, void 0, function* () {
        // Stream Stateless Run
        return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(this, void 0, void 0, function* () {
            var _a, e_3, _b, _c;
            const payload = c.req.valid("json");
            const signal = (0, hono_2.getDisconnectAbortSignal)(c, stream);
            const threadId = (0, uuid_1.v4)();
            yield options.threads.put(threadId, {
                metadata: {
                    graph_id: payload.assistant_id,
                    assistant_id: payload.assistant_id,
                },
            });
            try {
                const run = createStubRun(threadId, payload);
                try {
                    for (var _d = true, _e = __asyncValues((0, stream_1.streamState)(run, {
                        attempt: 1,
                        getGraph,
                        signal,
                    })), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const { event, data } = _c;
                        yield stream.writeSSE({ data: (0, serde_1.serialiseAsDict)(data), event });
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            finally {
                yield options.threads.delete(threadId);
            }
        }));
    }));
    return api;
}
