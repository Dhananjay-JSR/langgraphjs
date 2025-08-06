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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamState = streamState;
const messages_1 = require("@langchain/core/messages");
const tracer_langchain_1 = require("@langchain/core/tracers/tracer_langchain");
const langsmith_1 = require("langsmith");
const command_1 = require("./command");
const index_1 = require("./semver/index");
const runnableConfig_1 = require("./utils/runnableConfig");
const isRunnableConfig = (config) => {
    if (typeof config !== "object" || config == null)
        return false;
    return ("configurable" in config &&
        typeof config.configurable === "object" &&
        config.configurable != null);
};
function preprocessDebugCheckpointTask(task) {
    if (!isRunnableConfig(task.state) ||
        !(0, runnableConfig_1.taskRunnableConfigToCheckpoint)(task.state)) {
        return task;
    }
    const cloneTask = Object.assign({}, task);
    cloneTask.checkpoint = (0, runnableConfig_1.taskRunnableConfigToCheckpoint)(task.state);
    delete cloneTask.state;
    return cloneTask;
}
const isConfigurablePresent = (config) => typeof config === "object" &&
    config != null &&
    "configurable" in config &&
    typeof config.configurable === "object" &&
    config.configurable != null;
const deleteInternalConfigurableFields = (config) => {
    if (isConfigurablePresent(config)) {
        const newConfig = Object.assign(Object.assign({}, config), { configurable: Object.fromEntries(Object.entries(config.configurable).filter(([key]) => !key.startsWith("__"))) });
        delete newConfig.callbacks;
        return newConfig;
    }
    return config;
};
function preprocessDebugCheckpoint(payload) {
    const result = Object.assign(Object.assign({}, payload), { checkpoint: (0, runnableConfig_1.runnableConfigToCheckpoint)(payload["config"]), parent_checkpoint: (0, runnableConfig_1.runnableConfigToCheckpoint)(payload["parentConfig"]), tasks: payload["tasks"].map(preprocessDebugCheckpointTask) });
    // Handle LangGraph JS pascalCase vs snake_case
    // TODO: use stream to LangGraph.JS
    result.parent_config = payload["parentConfig"];
    delete result.parentConfig;
    result.config = deleteInternalConfigurableFields(result.config);
    result.parent_config = deleteInternalConfigurableFields(result.parent_config);
    return result;
}
let LANGGRAPH_VERSION;
function streamState(run, options) {
    return __asyncGenerator(this, arguments, function* streamState_1() {
        var _a, e_1, _b, _c;
        var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        const kwargs = run.kwargs;
        const graphId = (_e = (_d = kwargs.config) === null || _d === void 0 ? void 0 : _d.configurable) === null || _e === void 0 ? void 0 : _e.graph_id;
        if (!graphId || typeof graphId !== "string") {
            throw new Error("Invalid or missing graph_id");
        }
        const graph = yield __await(options.getGraph(graphId, kwargs.config, {
            checkpointer: kwargs.temporary ? null : undefined,
        }));
        const userStreamMode = (_f = kwargs.stream_mode) !== null && _f !== void 0 ? _f : [];
        const libStreamMode = new Set((_g = userStreamMode.filter((mode) => mode !== "events" && mode !== "messages-tuple")) !== null && _g !== void 0 ? _g : []);
        if (userStreamMode.includes("messages-tuple")) {
            libStreamMode.add("messages");
        }
        if (userStreamMode.includes("messages")) {
            libStreamMode.add("values");
        }
        if (!libStreamMode.has("debug"))
            libStreamMode.add("debug");
        yield yield __await({
            event: "metadata",
            data: { run_id: run.run_id, attempt: options.attempt },
        });
        if (!LANGGRAPH_VERSION) {
            const version = yield __await((0, index_1.checkLangGraphSemver)());
            LANGGRAPH_VERSION = version.find((v) => v.name === "@langchain/langgraph");
        }
        const metadata = Object.assign(Object.assign({}, (_h = kwargs.config) === null || _h === void 0 ? void 0 : _h.metadata), { run_attempt: options.attempt, langgraph_version: (_j = LANGGRAPH_VERSION === null || LANGGRAPH_VERSION === void 0 ? void 0 : LANGGRAPH_VERSION.version) !== null && _j !== void 0 ? _j : "0.0.0", langgraph_plan: "developer", langgraph_host: "self-hosted", langgraph_api_url: (_k = process.env.LANGGRAPH_API_URL) !== null && _k !== void 0 ? _k : undefined });
        const tracer = ((_o = (_m = (_l = run.kwargs) === null || _l === void 0 ? void 0 : _l.config) === null || _m === void 0 ? void 0 : _m.configurable) === null || _o === void 0 ? void 0 : _o.langsmith_project)
            ? new tracer_langchain_1.LangChainTracer({
                replicas: [
                    [
                        (_r = (_q = (_p = run.kwargs) === null || _p === void 0 ? void 0 : _p.config) === null || _q === void 0 ? void 0 : _q.configurable) === null || _r === void 0 ? void 0 : _r.langsmith_project,
                        {
                            reference_example_id: (_u = (_t = (_s = run.kwargs) === null || _s === void 0 ? void 0 : _s.config) === null || _t === void 0 ? void 0 : _t.configurable) === null || _u === void 0 ? void 0 : _u.langsmith_example_id,
                        },
                    ],
                    [(0, langsmith_1.getDefaultProjectName)(), undefined],
                ],
            })
            : undefined;
        const events = graph.streamEvents(kwargs.command != null
            ? (0, command_1.getLangGraphCommand)(kwargs.command)
            : (_v = kwargs.input) !== null && _v !== void 0 ? _v : null, Object.assign({ version: "v2", interruptAfter: kwargs.interrupt_after, interruptBefore: kwargs.interrupt_before, tags: (_w = kwargs.config) === null || _w === void 0 ? void 0 : _w.tags, context: kwargs.context, configurable: (_x = kwargs.config) === null || _x === void 0 ? void 0 : _x.configurable, recursionLimit: (_y = kwargs.config) === null || _y === void 0 ? void 0 : _y.recursion_limit, subgraphs: kwargs.subgraphs, metadata, runId: run.run_id, streamMode: [...libStreamMode], signal: options === null || options === void 0 ? void 0 : options.signal }, (tracer && { callbacks: [tracer] })));
        const messages = {};
        const completedIds = new Set();
        try {
            for (var _3 = true, events_1 = __asyncValues(events), events_1_1; events_1_1 = yield __await(events_1.next()), _a = events_1_1.done, !_a; _3 = true) {
                _c = events_1_1.value;
                _3 = false;
                const event = _c;
                if ((_z = event.tags) === null || _z === void 0 ? void 0 : _z.includes("langsmith:hidden"))
                    continue;
                if (event.event === "on_chain_stream" && event.run_id === run.run_id) {
                    const [ns, mode, chunk] = (kwargs.subgraphs ? event.data.chunk : [null, ...event.data.chunk]);
                    // Listen for debug events and capture checkpoint
                    let data = chunk;
                    if (mode === "debug") {
                        const debugChunk = chunk;
                        if (debugChunk.type === "checkpoint") {
                            const debugCheckpoint = preprocessDebugCheckpoint(debugChunk.payload);
                            (_0 = options === null || options === void 0 ? void 0 : options.onCheckpoint) === null || _0 === void 0 ? void 0 : _0.call(options, debugCheckpoint);
                            data = Object.assign(Object.assign({}, debugChunk), { payload: debugCheckpoint });
                        }
                        else if (debugChunk.type === "task_result") {
                            const debugResult = preprocessDebugCheckpointTask(debugChunk.payload);
                            (_1 = options === null || options === void 0 ? void 0 : options.onTaskResult) === null || _1 === void 0 ? void 0 : _1.call(options, debugResult);
                            data = Object.assign(Object.assign({}, debugChunk), { payload: debugResult });
                        }
                    }
                    if (mode === "messages") {
                        if (userStreamMode.includes("messages-tuple")) {
                            if (kwargs.subgraphs && (ns === null || ns === void 0 ? void 0 : ns.length)) {
                                yield yield __await({ event: `messages|${ns.join("|")}`, data });
                            }
                            else {
                                yield yield __await({ event: "messages", data });
                            }
                        }
                    }
                    else if (userStreamMode.includes(mode)) {
                        if (kwargs.subgraphs && (ns === null || ns === void 0 ? void 0 : ns.length)) {
                            yield yield __await({ event: `${mode}|${ns.join("|")}`, data });
                        }
                        else {
                            yield yield __await({ event: mode, data });
                        }
                    }
                }
                else if (userStreamMode.includes("events")) {
                    yield yield __await({ event: "events", data: event });
                }
                // TODO: we still rely on old messages mode based of streamMode=values
                // In order to fully switch to library messages mode, we need to do ensure that
                // `StreamMessagesHandler` sends the final message, which requires the following:
                // - handleLLMEnd does not send the final message b/c handleLLMNewToken sets the this.emittedChatModelRunIds[runId] flag. Python does not do that
                // - handleLLMEnd receives the final message as BaseMessageChunk rather than BaseMessage, which from the outside will become indistinguishable.
                // - handleLLMEnd should not dedupe the message
                // - Don't think there's an utility that would convert a BaseMessageChunk to a BaseMessage?
                if (userStreamMode.includes("messages")) {
                    if (event.event === "on_chain_stream" && event.run_id === run.run_id) {
                        const newMessages = [];
                        const [_, chunk] = event.data.chunk;
                        let chunkMessages = [];
                        if (typeof chunk === "object" &&
                            chunk != null &&
                            "messages" in chunk &&
                            !(0, messages_1.isBaseMessage)(chunk)) {
                            chunkMessages = chunk === null || chunk === void 0 ? void 0 : chunk.messages;
                        }
                        if (!Array.isArray(chunkMessages)) {
                            chunkMessages = [chunkMessages];
                        }
                        for (const message of chunkMessages) {
                            if (!message.id || completedIds.has(message.id))
                                continue;
                            completedIds.add(message.id);
                            newMessages.push(message);
                        }
                        if (newMessages.length > 0) {
                            yield yield __await({ event: "messages/complete", data: newMessages });
                        }
                    }
                    else if (event.event === "on_chat_model_stream" &&
                        !((_2 = event.tags) === null || _2 === void 0 ? void 0 : _2.includes("nostream"))) {
                        const message = event.data.chunk;
                        if (!message.id)
                            continue;
                        if (messages[message.id] == null) {
                            messages[message.id] = message;
                            yield yield __await({
                                event: "messages/metadata",
                                data: { [message.id]: { metadata: event.metadata } },
                            });
                        }
                        else {
                            messages[message.id] = messages[message.id].concat(message);
                        }
                        yield yield __await({ event: "messages/partial", data: [messages[message.id]] });
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_3 && !_a && (_b = events_1.return)) yield __await(_b.call(events_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (kwargs.feedback_keys) {
            const client = new langsmith_1.Client();
            const data = Object.fromEntries(yield __await(Promise.all(kwargs.feedback_keys.map((feedback) => __awaiter(this, void 0, void 0, function* () {
                const { url } = yield client.createPresignedFeedbackToken(run.run_id, feedback);
                return [feedback, url];
            })))));
            yield yield __await({ event: "feedback", data });
        }
    });
}
