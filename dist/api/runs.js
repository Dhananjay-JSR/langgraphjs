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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
const http_exception_1 = require("hono/http-exception");
const streaming_1 = require("hono/streaming");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const load_1 = require("../graph/load");
const logging_1 = require("../logging");
const schemas = __importStar(require("../schemas"));
const ops_1 = require("../storage/ops");
const hono_2 = require("../utils/hono");
const serde_1 = require("../utils/serde");
const api = new hono_1.Hono();
const createValidRun = (threadId, payload, kwargs) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { assistant_id: assistantId } = payload, run = __rest(payload, ["assistant_id"]);
    const { auth, headers } = kwargs !== null && kwargs !== void 0 ? kwargs : {};
    const runId = (0, uuid_1.v4)();
    const streamMode = Array.isArray(payload.stream_mode)
        ? payload.stream_mode
        : payload.stream_mode != null
            ? [payload.stream_mode]
            : [];
    if (streamMode.length === 0)
        streamMode.push("values");
    const multitaskStrategy = (_a = payload.multitask_strategy) !== null && _a !== void 0 ? _a : "reject";
    const preventInsertInInflight = multitaskStrategy === "reject";
    const config = Object.assign({}, run.config);
    if (run.checkpoint_id) {
        (_b = config.configurable) !== null && _b !== void 0 ? _b : (config.configurable = {});
        config.configurable.checkpoint_id = run.checkpoint_id;
    }
    if (run.checkpoint) {
        (_c = config.configurable) !== null && _c !== void 0 ? _c : (config.configurable = {});
        Object.assign(config.configurable, run.checkpoint);
    }
    if (run.langsmith_tracer) {
        (_d = config.configurable) !== null && _d !== void 0 ? _d : (config.configurable = {});
        Object.assign(config.configurable, {
            langsmith_project: run.langsmith_tracer.project_name,
            langsmith_example_id: run.langsmith_tracer.example_id,
        });
    }
    if (headers) {
        // Initialize configurable once to avoid repetition
        (_e = config.configurable) !== null && _e !== void 0 ? _e : (config.configurable = {});
        // Handle X- headers and user-agent using forEach method
        headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.startsWith("x-")) {
                if (["x-api-key", "x-tenant-id", "x-service-key"].includes(lowerKey)) {
                    return;
                }
                config.configurable[lowerKey] = value;
            }
            else if (lowerKey === "user-agent") {
                config.configurable[lowerKey] = value;
            }
        });
    }
    let userId;
    if (auth) {
        userId = (_f = auth.user.identity) !== null && _f !== void 0 ? _f : auth.user.id;
        (_g = config.configurable) !== null && _g !== void 0 ? _g : (config.configurable = {});
        config.configurable["langgraph_auth_user"] = auth.user;
        config.configurable["langgraph_auth_user_id"] = userId;
        config.configurable["langgraph_auth_permissions"] = auth.scopes;
    }
    let feedbackKeys = run.feedback_keys != null
        ? Array.isArray(run.feedback_keys)
            ? run.feedback_keys
            : [run.feedback_keys]
        : undefined;
    if (!(feedbackKeys === null || feedbackKeys === void 0 ? void 0 : feedbackKeys.length))
        feedbackKeys = undefined;
    const [first, ...inflight] = yield ops_1.Runs.put(runId, (0, load_1.getAssistantId)(assistantId), {
        input: run.input,
        command: run.command,
        config,
        context: run.context,
        stream_mode: streamMode,
        interrupt_before: run.interrupt_before,
        interrupt_after: run.interrupt_after,
        webhook: run.webhook,
        feedback_keys: feedbackKeys,
        temporary: threadId == null && ((_h = run.on_completion) !== null && _h !== void 0 ? _h : "delete") === "delete",
        subgraphs: (_j = run.stream_subgraphs) !== null && _j !== void 0 ? _j : false,
        resumable: (_k = run.stream_resumable) !== null && _k !== void 0 ? _k : false,
    }, {
        threadId,
        userId,
        metadata: run.metadata,
        status: "pending",
        multitaskStrategy,
        preventInsertInInflight,
        afterSeconds: payload.after_seconds,
        ifNotExists: payload.if_not_exists,
    }, auth);
    if ((first === null || first === void 0 ? void 0 : first.run_id) === runId) {
        logging_1.logger.info("Created run", { run_id: runId, thread_id: threadId });
        if ((multitaskStrategy === "interrupt" || multitaskStrategy === "rollback") &&
            inflight.length > 0) {
            try {
                yield ops_1.Runs.cancel(threadId, inflight.map((run) => run.run_id), { action: multitaskStrategy }, auth);
            }
            catch (error) {
                logging_1.logger.warn("Failed to cancel inflight runs, might be already cancelled", {
                    error,
                    run_ids: inflight.map((run) => run.run_id),
                    thread_id: threadId,
                });
            }
        }
        return first;
    }
    else if (multitaskStrategy === "reject") {
        throw new http_exception_1.HTTPException(422, {
            message: "Thread is already running a task. Wait for it to finish or choose a different multitask strategy.",
        });
    }
    throw new http_exception_1.HTTPException(500, {
        message: "Unreachable state when creating run",
    });
});
api.post("/runs/crons", (0, zod_validator_1.zValidator)("json", schemas.CronCreate), () => __awaiter(void 0, void 0, void 0, function* () {
    // Create Thread Cron
    throw new http_exception_1.HTTPException(500, { message: "Not implemented" });
}));
api.post("/runs/crons/search", (0, zod_validator_1.zValidator)("json", schemas.CronSearch), () => __awaiter(void 0, void 0, void 0, function* () {
    // Search Crons
    throw new http_exception_1.HTTPException(500, { message: "Not implemented" });
}));
api.delete("/runs/crons/:cron_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ cron_id: zod_1.z.string().uuid() })), () => __awaiter(void 0, void 0, void 0, function* () {
    // Delete Cron
    throw new http_exception_1.HTTPException(500, { message: "Not implemented" });
}));
api.post("/threads/:thread_id/runs/crons", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.CronCreate), () => __awaiter(void 0, void 0, void 0, function* () {
    // Create Thread Cron
    throw new http_exception_1.HTTPException(500, { message: "Not implemented" });
}));
api.post("/runs/stream", (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Stream Stateless Run
    const payload = c.req.valid("json");
    const run = yield createValidRun(undefined, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const cancelOnDisconnect = payload.on_disconnect === "cancel"
            ? (0, hono_2.getDisconnectAbortSignal)(c, stream)
            : undefined;
        try {
            try {
                for (var _d = true, _e = __asyncValues(ops_1.Runs.Stream.join(run.run_id, undefined, {
                    cancelOnDisconnect,
                    lastEventId: run.kwargs.resumable ? "-1" : undefined,
                    ignore404: true,
                }, c.var.auth)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const { event, data } = _c;
                    yield stream.writeSSE({ data: (0, serde_1.serialiseAsDict)(data), event });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        catch (error) {
            (0, logging_1.logError)(error, { prefix: "Error streaming run" });
        }
    }));
}));
// TODO: port to Python API
api.get("/runs/:run_id/stream", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ run_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ cancel_on_disconnect: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    const { run_id } = c.req.valid("param");
    const query = c.req.valid("query");
    const lastEventId = c.req.header("Last-Event-ID") || undefined;
    return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_2, _b, _c;
        const cancelOnDisconnect = query.cancel_on_disconnect
            ? (0, hono_2.getDisconnectAbortSignal)(c, stream)
            : undefined;
        try {
            try {
                for (var _d = true, _e = __asyncValues(ops_1.Runs.Stream.join(run_id, undefined, { cancelOnDisconnect, lastEventId, ignore404: true }, c.var.auth)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const { id, event, data } = _c;
                    yield stream.writeSSE({ id, data: (0, serde_1.serialiseAsDict)(data), event });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        catch (error) {
            (0, logging_1.logError)(error, { prefix: "Error streaming run" });
        }
    }));
}));
api.post("/runs/wait", (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Wait Stateless Run
    const payload = c.req.valid("json");
    const run = yield createValidRun(undefined, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    return (0, hono_2.waitKeepAlive)(c, ops_1.Runs.wait(run.run_id, undefined, c.var.auth));
}));
api.post("/runs", (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Create Stateless Run
    const payload = c.req.valid("json");
    const run = yield createValidRun(undefined, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    return (0, hono_2.jsonExtra)(c, run);
}));
api.post("/runs/batch", (0, zod_validator_1.zValidator)("json", schemas.RunBatchCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Batch Runs
    const payload = c.req.valid("json");
    const runs = yield Promise.all(payload.map((run) => createValidRun(undefined, run, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    })));
    return (0, hono_2.jsonExtra)(c, runs);
}));
api.get("/threads/:thread_id/runs", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({
    limit: zod_1.z.coerce.number().nullish(),
    offset: zod_1.z.coerce.number().nullish(),
    status: zod_1.z.string().nullish(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // List runs
    const { thread_id } = c.req.valid("param");
    const { limit, offset, status, metadata } = c.req.valid("query");
    const [runs] = yield Promise.all([
        ops_1.Runs.search(thread_id, { limit, offset, status, metadata }, c.var.auth),
        ops_1.Threads.get(thread_id, c.var.auth),
    ]);
    return (0, hono_2.jsonExtra)(c, runs);
}));
api.post("/threads/:thread_id/runs", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Create Run
    const { thread_id } = c.req.valid("param");
    const payload = c.req.valid("json");
    const run = yield createValidRun(thread_id, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    c.header("Content-Location", `/threads/${thread_id}/runs/${run.run_id}`);
    return (0, hono_2.jsonExtra)(c, run);
}));
api.post("/threads/:thread_id/runs/stream", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Stream Run
    const { thread_id } = c.req.valid("param");
    const payload = c.req.valid("json");
    const run = yield createValidRun(thread_id, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    c.header("Content-Location", `/threads/${thread_id}/runs/${run.run_id}`);
    return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_3, _b, _c;
        const cancelOnDisconnect = payload.on_disconnect === "cancel"
            ? (0, hono_2.getDisconnectAbortSignal)(c, stream)
            : undefined;
        try {
            try {
                for (var _d = true, _e = __asyncValues(ops_1.Runs.Stream.join(run.run_id, thread_id, {
                    cancelOnDisconnect,
                    lastEventId: run.kwargs.resumable ? "-1" : undefined,
                }, c.var.auth)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const { id, event, data } = _c;
                    yield stream.writeSSE({ id, data: (0, serde_1.serialiseAsDict)(data), event });
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
        catch (error) {
            (0, logging_1.logError)(error, { prefix: "Error streaming run" });
        }
    }));
}));
api.post("/threads/:thread_id/runs/wait", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("json", schemas.RunCreate), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Wait Run
    const { thread_id } = c.req.valid("param");
    const payload = c.req.valid("json");
    const run = yield createValidRun(thread_id, payload, {
        auth: c.var.auth,
        headers: c.req.raw.headers,
    });
    c.header("Content-Location", `/threads/${thread_id}/runs/${run.run_id}`);
    return (0, hono_2.waitKeepAlive)(c, ops_1.Runs.join(run.run_id, thread_id, c.var.auth));
}));
api.get("/threads/:thread_id/runs/:run_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid(), run_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    const { thread_id, run_id } = c.req.valid("param");
    const [run] = yield Promise.all([
        ops_1.Runs.get(run_id, thread_id, c.var.auth),
        ops_1.Threads.get(thread_id, c.var.auth),
    ]);
    if (run == null)
        throw new http_exception_1.HTTPException(404, { message: "Run not found" });
    return (0, hono_2.jsonExtra)(c, run);
}));
api.delete("/threads/:thread_id/runs/:run_id", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid(), run_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Delete Run
    const { thread_id, run_id } = c.req.valid("param");
    yield ops_1.Runs.delete(run_id, thread_id, c.var.auth);
    return c.body(null, 204);
}));
api.get("/threads/:thread_id/runs/:run_id/join", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid(), run_id: zod_1.z.string().uuid() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Join Run Http
    const { thread_id, run_id } = c.req.valid("param");
    return (0, hono_2.jsonExtra)(c, yield ops_1.Runs.join(run_id, thread_id, c.var.auth));
}));
api.get("/threads/:thread_id/runs/:run_id/stream", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid(), run_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({ cancel_on_disconnect: schemas.coercedBoolean.optional() })), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Stream Run Http
    const { thread_id, run_id } = c.req.valid("param");
    const { cancel_on_disconnect } = c.req.valid("query");
    const lastEventId = c.req.header("Last-Event-ID") || undefined;
    return (0, streaming_1.streamSSE)(c, (stream) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_4, _b, _c;
        const signal = cancel_on_disconnect
            ? (0, hono_2.getDisconnectAbortSignal)(c, stream)
            : undefined;
        try {
            for (var _d = true, _e = __asyncValues(ops_1.Runs.Stream.join(run_id, thread_id, { cancelOnDisconnect: signal, lastEventId }, c.var.auth)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                _c = _f.value;
                _d = false;
                const { id, event, data } = _c;
                yield stream.writeSSE({ id, data: (0, serde_1.serialiseAsDict)(data), event });
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }));
}));
api.post("/threads/:thread_id/runs/:run_id/cancel", (0, zod_validator_1.zValidator)("param", zod_1.z.object({ thread_id: zod_1.z.string().uuid(), run_id: zod_1.z.string().uuid() })), (0, zod_validator_1.zValidator)("query", zod_1.z.object({
    wait: zod_1.z.coerce.boolean().optional().default(false),
    action: zod_1.z.enum(["interrupt", "rollback"]).optional().default("interrupt"),
})), (c) => __awaiter(void 0, void 0, void 0, function* () {
    // Cancel Run Http
    const { thread_id, run_id } = c.req.valid("param");
    const { wait, action } = c.req.valid("query");
    yield ops_1.Runs.cancel(thread_id, [run_id], { action }, c.var.auth);
    if (wait)
        yield ops_1.Runs.join(run_id, thread_id, c.var.auth);
    return c.body(null, wait ? 204 : 202);
}));
exports.default = api;
