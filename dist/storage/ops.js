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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crons = exports.Runs = exports.Threads = exports.Assistants = exports.truncate = exports.StreamManager = exports.conn = void 0;
const http_exception_1 = require("hono/http-exception");
const uuid_1 = require("uuid");
const custom_1 = require("../auth/custom");
const command_1 = require("../command");
const load_1 = require("../graph/load");
const logging_1 = require("../logging");
const serde_1 = require("../utils/serde");
const checkpoint_1 = require("./checkpoint");
const persist_1 = require("./persist");
const store_1 = require("./store");
exports.conn = new persist_1.FileSystemPersistence(".langgraphjs_ops.json", () => ({
    runs: {},
    threads: {},
    assistants: {},
    assistant_versions: [],
    retry_counter: {},
}));
class TimeoutError extends Error {
}
class AbortError extends Error {
}
class Queue {
    constructor(options) {
        this.log = [];
        this.listeners = [];
        this.nextId = 0;
        this.resumable = false;
        this.resumable = options.resumable;
    }
    push(item) {
        this.log.push(item);
        for (const listener of this.listeners)
            listener(this.nextId);
        this.nextId += 1;
    }
    get(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.resumable) {
                const lastEventId = options.lastEventId;
                // Generator stores internal state of the read head index,
                let targetId = lastEventId != null ? +lastEventId + 1 : null;
                if (targetId == null ||
                    isNaN(targetId) ||
                    targetId < 0 ||
                    targetId >= this.log.length) {
                    targetId = null;
                }
                if (targetId != null)
                    return [String(targetId), this.log[targetId]];
            }
            else {
                if (this.log.length) {
                    const nextId = this.nextId - this.log.length;
                    const nextItem = this.log.shift();
                    return [String(nextId), nextItem];
                }
            }
            let timeout = undefined;
            let resolver = undefined;
            const clean = new AbortController();
            // listen to new item
            return yield new Promise((resolve, reject) => {
                var _a;
                timeout = setTimeout(() => reject(new TimeoutError()), options.timeout);
                resolver = resolve;
                (_a = options.signal) === null || _a === void 0 ? void 0 : _a.addEventListener("abort", () => reject(new AbortError()), { signal: clean.signal });
                this.listeners.push(resolver);
            })
                .then((idx) => {
                if (this.resumable) {
                    return [String(idx), this.log[idx]];
                }
                const nextId = this.nextId - this.log.length;
                const nextItem = this.log.shift();
                return [String(nextId), nextItem];
            })
                .finally(() => {
                this.listeners = this.listeners.filter((l) => l !== resolver);
                clearTimeout(timeout);
                clean.abort();
            });
        });
    }
}
class CancellationAbortController extends AbortController {
    abort(reason) {
        super.abort(reason);
    }
}
class StreamManagerImpl {
    constructor() {
        this.readers = {};
        this.control = {};
    }
    getQueue(runId, options) {
        if (this.readers[runId] == null) {
            this.readers[runId] = new Queue(options);
        }
        return this.readers[runId];
    }
    getControl(runId) {
        if (this.control[runId] == null)
            return undefined;
        return this.control[runId];
    }
    isLocked(runId) {
        return this.control[runId] != null;
    }
    lock(runId) {
        if (this.control[runId] != null) {
            logging_1.logger.warn("Run already locked", { run_id: runId });
        }
        this.control[runId] = new CancellationAbortController();
        return this.control[runId].signal;
    }
    unlock(runId) {
        delete this.control[runId];
    }
}
exports.StreamManager = new StreamManagerImpl();
const truncate = (flags) => {
    return exports.conn.with((STORE) => {
        if (flags.runs)
            STORE.runs = {};
        if (flags.threads)
            STORE.threads = {};
        if (flags.assistants) {
            STORE.assistants = Object.fromEntries(Object.entries(STORE.assistants).filter(([key, assistant]) => {
                var _a;
                return ((_a = assistant.metadata) === null || _a === void 0 ? void 0 : _a.created_by) === "system" &&
                    (0, uuid_1.v5)(assistant.graph_id, load_1.NAMESPACE_GRAPH) === key;
            }));
        }
        if (flags.checkpointer)
            checkpoint_1.checkpointer.clear();
        if (flags.store)
            store_1.store.clear();
    });
};
exports.truncate = truncate;
const isObject = (value) => {
    return typeof value === "object" && value !== null;
};
const isJsonbContained = (superset, subset) => {
    if (superset == null || subset == null)
        return true;
    for (const [key, value] of Object.entries(subset)) {
        if (superset[key] == null)
            return false;
        if (isObject(value) && isObject(superset[key])) {
            if (!isJsonbContained(superset[key], value))
                return false;
        }
        else if (superset[key] !== value) {
            return false;
        }
    }
    return true;
};
class Assistants {
    static search(options, auth) {
        return __asyncGenerator(this, arguments, function* search_1() {
            const [filters] = yield __await((0, custom_1.handleAuthEvent)(auth, "assistants:search", {
                graph_id: options.graph_id,
                metadata: options.metadata,
                limit: options.limit,
                offset: options.offset,
            }));
            yield __await(yield* __asyncDelegator(__asyncValues(exports.conn.withGenerator(function (STORE) {
                return __asyncGenerator(this, arguments, function* () {
                    var _a;
                    let filtered = Object.values(STORE.assistants)
                        .filter((assistant) => {
                        if (options.graph_id != null &&
                            assistant["graph_id"] !== options.graph_id) {
                            return false;
                        }
                        if (options.metadata != null &&
                            !isJsonbContained(assistant["metadata"], options.metadata)) {
                            return false;
                        }
                        if (!(0, custom_1.isAuthMatching)(assistant["metadata"], filters)) {
                            return false;
                        }
                        return true;
                    })
                        .sort((a, b) => {
                        var _a, _b, _c, _d;
                        const aCreatedAt = (_b = (_a = a["created_at"]) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
                        const bCreatedAt = (_d = (_c = b["created_at"]) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0;
                        return bCreatedAt - aCreatedAt;
                    });
                    // Calculate total count before pagination
                    const total = filtered.length;
                    for (const assistant of filtered.slice(options.offset, options.offset + options.limit)) {
                        yield yield __await({
                            assistant: Object.assign(Object.assign({}, assistant), { name: (_a = assistant.name) !== null && _a !== void 0 ? _a : assistant.graph_id }),
                            total,
                        });
                    }
                });
            }))));
        });
    }
    static get(assistant_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:read", {
                assistant_id,
            });
            return exports.conn.with((STORE) => {
                var _a;
                const result = STORE.assistants[assistant_id];
                if (result == null)
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                if (!(0, custom_1.isAuthMatching)(result["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                return Object.assign(Object.assign({}, result), { name: (_a = result.name) !== null && _a !== void 0 ? _a : result.graph_id });
            });
        });
    }
    static put(assistant_id, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters, mutable] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:create", {
                assistant_id,
                config: options.config,
                context: options.context,
                graph_id: options.graph_id,
                metadata: options.metadata,
                if_exists: options.if_exists,
                name: options.name,
            });
            return exports.conn.with((STORE) => {
                var _a, _b, _c, _d, _e, _f, _g;
                var _h;
                if (STORE.assistants[assistant_id] != null) {
                    const existingAssistant = STORE.assistants[assistant_id];
                    if (!(0, custom_1.isAuthMatching)(existingAssistant === null || existingAssistant === void 0 ? void 0 : existingAssistant.metadata, filters)) {
                        throw new http_exception_1.HTTPException(409, { message: "Assistant already exists" });
                    }
                    if (options.if_exists === "raise") {
                        throw new http_exception_1.HTTPException(409, { message: "Assistant already exists" });
                    }
                    return existingAssistant;
                }
                const now = new Date();
                (_a = (_h = STORE.assistants)[assistant_id]) !== null && _a !== void 0 ? _a : (_h[assistant_id] = {
                    assistant_id: assistant_id,
                    version: 1,
                    config: (_b = options.config) !== null && _b !== void 0 ? _b : {},
                    context: (_c = options.context) !== null && _c !== void 0 ? _c : {},
                    created_at: now,
                    updated_at: now,
                    graph_id: options.graph_id,
                    metadata: (_d = mutable.metadata) !== null && _d !== void 0 ? _d : {},
                    name: options.name || options.graph_id,
                });
                STORE.assistant_versions.push({
                    assistant_id: assistant_id,
                    version: 1,
                    graph_id: options.graph_id,
                    config: (_e = options.config) !== null && _e !== void 0 ? _e : {},
                    context: (_f = options.context) !== null && _f !== void 0 ? _f : {},
                    metadata: (_g = mutable.metadata) !== null && _g !== void 0 ? _g : {},
                    created_at: now,
                    name: options.name || options.graph_id,
                });
                return STORE.assistants[assistant_id];
            });
        });
    }
    static patch(assistantId, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters, mutable] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:update", {
                assistant_id: assistantId,
                graph_id: options === null || options === void 0 ? void 0 : options.graph_id,
                config: options === null || options === void 0 ? void 0 : options.config,
                metadata: options === null || options === void 0 ? void 0 : options.metadata,
                name: options === null || options === void 0 ? void 0 : options.name,
            });
            return exports.conn.with((STORE) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const assistant = STORE.assistants[assistantId];
                if (!assistant) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                if (!(0, custom_1.isAuthMatching)(assistant["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                const now = new Date();
                const metadata = mutable.metadata != null
                    ? Object.assign(Object.assign({}, assistant["metadata"]), mutable.metadata) : null;
                if ((options === null || options === void 0 ? void 0 : options.graph_id) != null) {
                    assistant["graph_id"] = (_a = options === null || options === void 0 ? void 0 : options.graph_id) !== null && _a !== void 0 ? _a : assistant["graph_id"];
                }
                if ((options === null || options === void 0 ? void 0 : options.config) != null) {
                    assistant["config"] = (_b = options === null || options === void 0 ? void 0 : options.config) !== null && _b !== void 0 ? _b : assistant["config"];
                }
                if ((options === null || options === void 0 ? void 0 : options.context) != null) {
                    assistant["context"] = (_c = options === null || options === void 0 ? void 0 : options.context) !== null && _c !== void 0 ? _c : assistant["context"];
                }
                if ((options === null || options === void 0 ? void 0 : options.name) != null) {
                    assistant["name"] = (_d = options === null || options === void 0 ? void 0 : options.name) !== null && _d !== void 0 ? _d : assistant["name"];
                }
                if (metadata != null) {
                    assistant["metadata"] = metadata !== null && metadata !== void 0 ? metadata : assistant["metadata"];
                }
                assistant["updated_at"] = now;
                const newVersion = Math.max(...STORE.assistant_versions
                    .filter((v) => v["assistant_id"] === assistantId)
                    .map((v) => v["version"])) + 1;
                assistant.version = newVersion;
                const newVersionEntry = {
                    assistant_id: assistantId,
                    version: newVersion,
                    graph_id: (_e = options === null || options === void 0 ? void 0 : options.graph_id) !== null && _e !== void 0 ? _e : assistant["graph_id"],
                    config: (_f = options === null || options === void 0 ? void 0 : options.config) !== null && _f !== void 0 ? _f : assistant["config"],
                    context: (_g = options === null || options === void 0 ? void 0 : options.context) !== null && _g !== void 0 ? _g : assistant["context"],
                    name: (_h = options === null || options === void 0 ? void 0 : options.name) !== null && _h !== void 0 ? _h : assistant["name"],
                    metadata: metadata !== null && metadata !== void 0 ? metadata : assistant["metadata"],
                    created_at: now,
                };
                STORE.assistant_versions.push(newVersionEntry);
                return assistant;
            });
        });
    }
    static delete(assistant_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:delete", {
                assistant_id,
            });
            return exports.conn.with((STORE) => {
                const assistant = STORE.assistants[assistant_id];
                if (!assistant) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                if (!(0, custom_1.isAuthMatching)(assistant["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                delete STORE.assistants[assistant_id];
                // Cascade delete for assistant versions and crons
                STORE.assistant_versions = STORE.assistant_versions.filter((v) => v["assistant_id"] !== assistant_id);
                for (const run of Object.values(STORE.runs)) {
                    if (run["assistant_id"] === assistant_id) {
                        delete STORE.runs[run["run_id"]];
                    }
                }
                return [assistant.assistant_id];
            });
        });
    }
    static setLatest(assistant_id, version, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:update", {
                assistant_id,
                version,
            });
            return exports.conn.with((STORE) => {
                const assistant = STORE.assistants[assistant_id];
                if (!assistant) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                if (!(0, custom_1.isAuthMatching)(assistant["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, { message: "Assistant not found" });
                }
                const assistantVersion = STORE.assistant_versions.find((v) => v["assistant_id"] === assistant_id && v["version"] === version);
                if (!assistantVersion)
                    throw new http_exception_1.HTTPException(404, {
                        message: "Assistant version not found",
                    });
                const now = new Date();
                STORE.assistants[assistant_id] = Object.assign(Object.assign({}, assistant), { config: assistantVersion["config"], metadata: assistantVersion["metadata"], version: assistantVersion["version"], name: assistantVersion["name"], updated_at: now });
                return STORE.assistants[assistant_id];
            });
        });
    }
    static getVersions(assistant_id, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "assistants:read", {
                assistant_id,
            });
            return exports.conn.with((STORE) => {
                const versions = STORE.assistant_versions
                    .filter((version) => {
                    if (version["assistant_id"] !== assistant_id)
                        return false;
                    if (options.metadata != null &&
                        !isJsonbContained(version["metadata"], options.metadata)) {
                        return false;
                    }
                    if (!(0, custom_1.isAuthMatching)(version["metadata"], filters)) {
                        return false;
                    }
                    return true;
                })
                    .sort((a, b) => b["version"] - a["version"]);
                return versions.slice(options.offset, options.offset + options.limit);
            });
        });
    }
}
exports.Assistants = Assistants;
class Threads {
    static search(options, auth) {
        return __asyncGenerator(this, arguments, function* search_2() {
            const [filters] = yield __await((0, custom_1.handleAuthEvent)(auth, "threads:search", {
                metadata: options.metadata,
                status: options.status,
                values: options.values,
                limit: options.limit,
                offset: options.offset,
            }));
            yield __await(yield* __asyncDelegator(__asyncValues(exports.conn.withGenerator(function (STORE) {
                return __asyncGenerator(this, arguments, function* () {
                    const filtered = Object.values(STORE.threads)
                        .filter((thread) => {
                        if (options.metadata != null &&
                            !isJsonbContained(thread["metadata"], options.metadata))
                            return false;
                        if (options.values != null &&
                            typeof thread["values"] !== "undefined" &&
                            !isJsonbContained(thread["values"], options.values))
                            return false;
                        if (options.status != null && thread["status"] !== options.status)
                            return false;
                        if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters))
                            return false;
                        return true;
                    })
                        .sort((a, b) => {
                        var _a, _b;
                        const sortBy = (_a = options.sort_by) !== null && _a !== void 0 ? _a : "created_at";
                        const sortOrder = (_b = options.sort_order) !== null && _b !== void 0 ? _b : "desc";
                        if (sortBy === "created_at" || sortBy === "updated_at") {
                            const aTime = a[sortBy].getTime();
                            const bTime = b[sortBy].getTime();
                            return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
                        }
                        if (sortBy === "thread_id" || sortBy === "status") {
                            const aVal = a[sortBy];
                            const bVal = b[sortBy];
                            return sortOrder === "desc"
                                ? bVal.localeCompare(aVal)
                                : aVal.localeCompare(bVal);
                        }
                        return 0;
                    });
                    // Calculate total count before pagination
                    const total = filtered.length;
                    for (const thread of filtered.slice(options.offset, options.offset + options.limit)) {
                        yield yield __await({ thread, total });
                    }
                });
            }))));
        });
    }
    // TODO: make this accept `undefined`
    static get(thread_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:read", {
                thread_id,
            });
            return exports.conn.with((STORE) => {
                const result = STORE.threads[thread_id];
                if (result == null) {
                    throw new http_exception_1.HTTPException(404, {
                        message: `Thread with ID ${thread_id} not found`,
                    });
                }
                if (!(0, custom_1.isAuthMatching)(result["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, {
                        message: `Thread with ID ${thread_id} not found`,
                    });
                }
                return result;
            });
        });
    }
    static put(thread_id, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters, mutable] = yield (0, custom_1.handleAuthEvent)(auth, "threads:create", {
                thread_id,
                metadata: options.metadata,
                if_exists: options.if_exists,
            });
            return exports.conn.with((STORE) => {
                var _a, _b;
                var _c;
                const now = new Date();
                if (STORE.threads[thread_id] != null) {
                    const existingThread = STORE.threads[thread_id];
                    if (!(0, custom_1.isAuthMatching)(existingThread["metadata"], filters)) {
                        throw new http_exception_1.HTTPException(409, { message: "Thread already exists" });
                    }
                    if ((options === null || options === void 0 ? void 0 : options.if_exists) === "raise") {
                        throw new http_exception_1.HTTPException(409, { message: "Thread already exists" });
                    }
                    return existingThread;
                }
                (_a = (_c = STORE.threads)[thread_id]) !== null && _a !== void 0 ? _a : (_c[thread_id] = {
                    thread_id: thread_id,
                    created_at: now,
                    updated_at: now,
                    metadata: (_b = mutable === null || mutable === void 0 ? void 0 : mutable.metadata) !== null && _b !== void 0 ? _b : {},
                    status: "idle",
                    config: {},
                    values: undefined,
                });
                return STORE.threads[thread_id];
            });
        });
    }
    static patch(threadId, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters, mutable] = yield (0, custom_1.handleAuthEvent)(auth, "threads:update", {
                thread_id: threadId,
                metadata: options.metadata,
            });
            return exports.conn.with((STORE) => {
                const thread = STORE.threads[threadId];
                if (!thread) {
                    throw new http_exception_1.HTTPException(404, { message: "Thread not found" });
                }
                if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                    // TODO: is this correct status code?
                    throw new http_exception_1.HTTPException(404, { message: "Thread not found" });
                }
                const now = new Date();
                if (mutable.metadata != null) {
                    thread["metadata"] = Object.assign(Object.assign({}, thread["metadata"]), mutable.metadata);
                }
                thread["updated_at"] = now;
                return thread;
            });
        });
    }
    static setStatus(threadId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return exports.conn.with((STORE) => {
                const thread = STORE.threads[threadId];
                if (!thread)
                    throw new http_exception_1.HTTPException(404, { message: "Thread not found" });
                let hasNext = false;
                if (options.checkpoint != null) {
                    hasNext = options.checkpoint.next.length > 0;
                }
                const hasPendingRuns = Object.values(STORE.runs).some((run) => run["thread_id"] === threadId && run["status"] === "pending");
                let status = "idle";
                if (options.exception != null) {
                    status = "error";
                }
                else if (hasNext) {
                    status = "interrupted";
                }
                else if (hasPendingRuns) {
                    status = "busy";
                }
                const now = new Date();
                thread.updated_at = now;
                thread.status = status;
                thread.values =
                    options.checkpoint != null ? options.checkpoint.values : undefined;
                thread.interrupts =
                    options.checkpoint != null
                        ? options.checkpoint.tasks.reduce((acc, task) => {
                            if (task.interrupts)
                                acc[task.id] = task.interrupts;
                            return acc;
                        }, {})
                        : undefined;
            });
        });
    }
    static delete(thread_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:delete", {
                thread_id,
            });
            return exports.conn.with((STORE) => {
                const thread = STORE.threads[thread_id];
                if (!thread) {
                    throw new http_exception_1.HTTPException(404, {
                        message: `Thread with ID ${thread_id} not found`,
                    });
                }
                if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404, {
                        message: `Thread with ID ${thread_id} not found`,
                    });
                }
                delete STORE.threads[thread_id];
                for (const run of Object.values(STORE.runs)) {
                    if (run["thread_id"] === thread_id) {
                        delete STORE.runs[run["run_id"]];
                    }
                }
                checkpoint_1.checkpointer.delete(thread_id, null);
                return [thread.thread_id];
            });
        });
    }
    static copy(thread_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:read", {
                thread_id,
            });
            return exports.conn.with((STORE) => {
                const thread = STORE.threads[thread_id];
                if (!thread)
                    throw new http_exception_1.HTTPException(409, { message: "Thread not found" });
                if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(409, { message: "Thread not found" });
                }
                const newThreadId = (0, uuid_1.v4)();
                const now = new Date();
                STORE.threads[newThreadId] = {
                    thread_id: newThreadId,
                    created_at: now,
                    updated_at: now,
                    metadata: Object.assign(Object.assign({}, thread.metadata), { thread_id: newThreadId }),
                    config: {},
                    status: "idle",
                };
                checkpoint_1.checkpointer.copy(thread_id, newThreadId);
                return STORE.threads[newThreadId];
            });
        });
    }
}
exports.Threads = Threads;
Threads.State = class {
    static get(config, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const subgraphs = (_a = options.subgraphs) !== null && _a !== void 0 ? _a : false;
            const threadId = (_b = config.configurable) === null || _b === void 0 ? void 0 : _b.thread_id;
            const thread = threadId ? yield Threads.get(threadId, auth) : undefined;
            const metadata = (_c = thread === null || thread === void 0 ? void 0 : thread.metadata) !== null && _c !== void 0 ? _c : {};
            const graphId = metadata === null || metadata === void 0 ? void 0 : metadata.graph_id;
            if (!thread || graphId == null) {
                return {
                    values: {},
                    next: [],
                    config: {},
                    metadata: undefined,
                    createdAt: undefined,
                    parentConfig: undefined,
                    tasks: [],
                };
            }
            const graph = yield (0, load_1.getGraph)(graphId, thread.config, {
                checkpointer: checkpoint_1.checkpointer,
                store: store_1.store,
            });
            const result = yield graph.getState(config, { subgraphs });
            if (result.metadata != null &&
                "checkpoint_ns" in result.metadata &&
                result.metadata["checkpoint_ns"] === "") {
                delete result.metadata["checkpoint_ns"];
            }
            return result;
        });
    }
    static post(config, values, asNode, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            var _g, _h;
            const threadId = (_a = config.configurable) === null || _a === void 0 ? void 0 : _a.thread_id;
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:update", {
                thread_id: threadId,
            });
            const thread = threadId ? yield Threads.get(threadId, auth) : undefined;
            if (!thread)
                throw new http_exception_1.HTTPException(404, {
                    message: `Thread ${threadId} not found`,
                });
            if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                throw new http_exception_1.HTTPException(403);
            }
            // do a check if there are no pending runs
            yield exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                if (Object.values(STORE.runs).some((run) => run.thread_id === threadId &&
                    (run.status === "pending" || run.status === "running"))) {
                    throw new http_exception_1.HTTPException(409, { message: "Thread is busy" });
                }
            }));
            const graphId = (_b = thread.metadata) === null || _b === void 0 ? void 0 : _b.graph_id;
            if (graphId == null) {
                throw new http_exception_1.HTTPException(400, {
                    message: `Thread ${threadId} has no graph ID`,
                });
            }
            (_c = config.configurable) !== null && _c !== void 0 ? _c : (config.configurable = {});
            (_d = (_g = config.configurable).graph_id) !== null && _d !== void 0 ? _d : (_g.graph_id = graphId);
            const graph = yield (0, load_1.getGraph)(graphId, thread.config, {
                checkpointer: checkpoint_1.checkpointer,
                store: store_1.store,
            });
            const updateConfig = structuredClone(config);
            (_e = updateConfig.configurable) !== null && _e !== void 0 ? _e : (updateConfig.configurable = {});
            (_f = (_h = updateConfig.configurable).checkpoint_ns) !== null && _f !== void 0 ? _f : (_h.checkpoint_ns = "");
            const nextConfig = yield graph.updateState(updateConfig, values, asNode);
            const state = yield Threads.State.get(config, { subgraphs: false }, auth);
            // update thread values
            yield exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                for (const thread of Object.values(STORE.threads)) {
                    if (thread.thread_id === threadId) {
                        thread.values = state.values;
                        break;
                    }
                }
            }));
            return { checkpoint: nextConfig.configurable };
        });
    }
    static bulk(config, supersteps, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            var _g, _h;
            const threadId = (_a = config.configurable) === null || _a === void 0 ? void 0 : _a.thread_id;
            if (!threadId)
                return [];
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:update", {
                thread_id: threadId,
            });
            const thread = yield Threads.get(threadId, auth);
            if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                throw new http_exception_1.HTTPException(403);
            }
            const graphId = (_b = thread.metadata) === null || _b === void 0 ? void 0 : _b.graph_id;
            if (graphId == null) {
                throw new http_exception_1.HTTPException(400, {
                    message: `Thread ${threadId} has no graph ID`,
                });
            }
            (_c = config.configurable) !== null && _c !== void 0 ? _c : (config.configurable = {});
            (_d = (_g = config.configurable).graph_id) !== null && _d !== void 0 ? _d : (_g.graph_id = graphId);
            const graph = yield (0, load_1.getGraph)(graphId, thread.config, {
                checkpointer: checkpoint_1.checkpointer,
                store: store_1.store,
            });
            const updateConfig = structuredClone(config);
            (_e = updateConfig.configurable) !== null && _e !== void 0 ? _e : (updateConfig.configurable = {});
            (_f = (_h = updateConfig.configurable).checkpoint_ns) !== null && _f !== void 0 ? _f : (_h.checkpoint_ns = "");
            const nextConfig = yield graph.bulkUpdateState(updateConfig, supersteps.map((i) => ({
                updates: i.updates.map((j) => ({
                    values: j.command != null ? (0, command_1.getLangGraphCommand)(j.command) : j.values,
                    asNode: j.as_node,
                })),
            })));
            const state = yield Threads.State.get(config, { subgraphs: false }, auth);
            // update thread values
            yield exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                for (const thread of Object.values(STORE.threads)) {
                    if (thread.thread_id === threadId) {
                        thread.values = state.values;
                        break;
                    }
                }
            }));
            return { checkpoint: nextConfig.configurable };
        });
    }
    static list(config, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            var _d, _e, _f;
            const threadId = (_d = config.configurable) === null || _d === void 0 ? void 0 : _d.thread_id;
            if (!threadId)
                return [];
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:read", {
                thread_id: threadId,
            });
            const thread = yield Threads.get(threadId, auth);
            if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters))
                return [];
            const graphId = (_e = thread.metadata) === null || _e === void 0 ? void 0 : _e.graph_id;
            if (graphId == null)
                return [];
            const graph = yield (0, load_1.getGraph)(graphId, thread.config, {
                checkpointer: checkpoint_1.checkpointer,
                store: store_1.store,
            });
            const before = typeof (options === null || options === void 0 ? void 0 : options.before) === "string"
                ? { configurable: { checkpoint_id: options.before } }
                : options === null || options === void 0 ? void 0 : options.before;
            const states = [];
            try {
                for (var _g = true, _h = __asyncValues(graph.getStateHistory(config, {
                    limit: (_f = options === null || options === void 0 ? void 0 : options.limit) !== null && _f !== void 0 ? _f : 10,
                    before,
                    filter: options === null || options === void 0 ? void 0 : options.metadata,
                })), _j; _j = yield _h.next(), _a = _j.done, !_a; _g = true) {
                    _c = _j.value;
                    _g = false;
                    const state = _c;
                    states.push(state);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_g && !_a && (_b = _h.return)) yield _b.call(_h);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return states;
        });
    }
};
class Runs {
    static next() {
        return __asyncGenerator(this, arguments, function* next_1() {
            yield __await(yield* __asyncDelegator(__asyncValues(exports.conn.withGenerator(function (STORE, options) {
                return __asyncGenerator(this, arguments, function* () {
                    var _a;
                    var _b;
                    const now = new Date();
                    const pendingRunIds = Object.values(STORE.runs)
                        .filter((run) => run.status === "pending" && run.created_at < now)
                        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
                        .map((run) => run.run_id);
                    if (!pendingRunIds.length) {
                        return yield __await(void 0);
                    }
                    for (const runId of pendingRunIds) {
                        if (exports.StreamManager.isLocked(runId))
                            continue;
                        try {
                            const signal = exports.StreamManager.lock(runId);
                            const run = STORE.runs[runId];
                            if (!run)
                                continue;
                            const threadId = run.thread_id;
                            const thread = STORE.threads[threadId];
                            if (!thread) {
                                logging_1.logger.warn(`Unexpected missing thread in Runs.next: ${threadId}`);
                                continue;
                            }
                            // is the run still valid?
                            if (run.status !== "pending")
                                continue;
                            if (Object.values(STORE.runs).some((run) => run.thread_id === threadId && run.status === "running")) {
                                continue;
                            }
                            options.schedulePersist();
                            (_a = (_b = STORE.retry_counter)[runId]) !== null && _a !== void 0 ? _a : (_b[runId] = 0);
                            STORE.retry_counter[runId] += 1;
                            STORE.runs[runId].status = "running";
                            yield yield __await({ run, attempt: STORE.retry_counter[runId], signal });
                        }
                        finally {
                            exports.StreamManager.unlock(runId);
                        }
                    }
                });
            }))));
        });
    }
    static put(runId, assistantId, kwargs, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
                const assistant = STORE.assistants[assistantId];
                if (!assistant) {
                    throw new http_exception_1.HTTPException(404, {
                        message: `No assistant found for "${assistantId}". Make sure the assistant ID is for a valid assistant or a valid graph ID.`,
                    });
                }
                const ifNotExists = (_a = options === null || options === void 0 ? void 0 : options.ifNotExists) !== null && _a !== void 0 ? _a : "reject";
                const multitaskStrategy = (_b = options === null || options === void 0 ? void 0 : options.multitaskStrategy) !== null && _b !== void 0 ? _b : "reject";
                const afterSeconds = (_c = options === null || options === void 0 ? void 0 : options.afterSeconds) !== null && _c !== void 0 ? _c : 0;
                const status = (_d = options === null || options === void 0 ? void 0 : options.status) !== null && _d !== void 0 ? _d : "pending";
                let threadId = options === null || options === void 0 ? void 0 : options.threadId;
                const [filters, mutable] = yield (0, custom_1.handleAuthEvent)(auth, "threads:create_run", {
                    thread_id: threadId,
                    assistant_id: assistantId,
                    run_id: runId,
                    status: status,
                    metadata: (_e = options === null || options === void 0 ? void 0 : options.metadata) !== null && _e !== void 0 ? _e : {},
                    prevent_insert_if_inflight: options === null || options === void 0 ? void 0 : options.preventInsertInInflight,
                    multitask_strategy: multitaskStrategy,
                    if_not_exists: ifNotExists,
                    after_seconds: afterSeconds,
                    kwargs,
                });
                const metadata = (_f = mutable.metadata) !== null && _f !== void 0 ? _f : {};
                const config = (_g = kwargs.config) !== null && _g !== void 0 ? _g : {};
                const existingThread = Object.values(STORE.threads).find((thread) => thread.thread_id === threadId);
                if (existingThread &&
                    !(0, custom_1.isAuthMatching)(existingThread["metadata"], filters)) {
                    throw new http_exception_1.HTTPException(404);
                }
                const now = new Date();
                if (!existingThread && (threadId == null || ifNotExists === "create")) {
                    threadId !== null && threadId !== void 0 ? threadId : (threadId = (0, uuid_1.v4)());
                    const thread = {
                        thread_id: threadId,
                        status: "busy",
                        metadata: Object.assign({ graph_id: assistant.graph_id, assistant_id: assistantId }, metadata),
                        config: Object.assign({}, assistant.config, config, {
                            configurable: Object.assign({}, (_h = assistant.config) === null || _h === void 0 ? void 0 : _h.configurable, config === null || config === void 0 ? void 0 : config.configurable),
                        }),
                        created_at: now,
                        updated_at: now,
                    };
                    STORE.threads[threadId] = thread;
                }
                else if (existingThread) {
                    if (existingThread.status !== "busy") {
                        existingThread.status = "busy";
                        existingThread.metadata = Object.assign({}, existingThread.metadata, {
                            graph_id: assistant.graph_id,
                            assistant_id: assistantId,
                        });
                        existingThread.config = Object.assign({}, assistant.config, existingThread.config, config, {
                            configurable: Object.assign({}, (_j = assistant.config) === null || _j === void 0 ? void 0 : _j.configurable, (_k = existingThread === null || existingThread === void 0 ? void 0 : existingThread.config) === null || _k === void 0 ? void 0 : _k.configurable, config === null || config === void 0 ? void 0 : config.configurable),
                        });
                        existingThread.updated_at = now;
                    }
                }
                else {
                    return [];
                }
                // if multitask_mode = reject, check for inflight runs
                // and if there are any, return them to reject putting a new run
                const inflightRuns = Object.values(STORE.runs).filter((run) => run.thread_id === threadId &&
                    (run.status === "pending" || run.status === "running"));
                if (options === null || options === void 0 ? void 0 : options.preventInsertInInflight) {
                    if (inflightRuns.length > 0)
                        return inflightRuns;
                }
                // create new run
                const configurable = Object.assign({}, (_l = assistant.config) === null || _l === void 0 ? void 0 : _l.configurable, (_m = existingThread === null || existingThread === void 0 ? void 0 : existingThread.config) === null || _m === void 0 ? void 0 : _m.configurable, config === null || config === void 0 ? void 0 : config.configurable, {
                    run_id: runId,
                    thread_id: threadId,
                    graph_id: assistant.graph_id,
                    assistant_id: assistantId,
                    user_id: (_v = (_s = (_p = (_o = config.configurable) === null || _o === void 0 ? void 0 : _o.user_id) !== null && _p !== void 0 ? _p : (_r = (_q = existingThread === null || existingThread === void 0 ? void 0 : existingThread.config) === null || _q === void 0 ? void 0 : _q.configurable) === null || _r === void 0 ? void 0 : _r.user_id) !== null && _s !== void 0 ? _s : (_u = (_t = assistant.config) === null || _t === void 0 ? void 0 : _t.configurable) === null || _u === void 0 ? void 0 : _u.user_id) !== null && _v !== void 0 ? _v : options === null || options === void 0 ? void 0 : options.userId,
                });
                const mergedMetadata = Object.assign({}, assistant.metadata, existingThread === null || existingThread === void 0 ? void 0 : existingThread.metadata, metadata);
                const newRun = {
                    run_id: runId,
                    thread_id: threadId,
                    assistant_id: assistantId,
                    metadata: mergedMetadata,
                    status: status,
                    kwargs: Object.assign({}, kwargs, {
                        config: Object.assign({}, assistant.config, config, { configurable }, { metadata: mergedMetadata }),
                        context: typeof assistant.context !== "object" && assistant.context != null
                            ? (_w = assistant.context) !== null && _w !== void 0 ? _w : kwargs.context
                            : Object.assign({}, assistant.context, kwargs.context),
                    }),
                    multitask_strategy: multitaskStrategy,
                    created_at: new Date(now.valueOf() + afterSeconds * 1000),
                    updated_at: now,
                };
                STORE.runs[runId] = newRun;
                return [newRun, ...inflightRuns];
            }));
        });
    }
    static get(runId, thread_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:read", {
                thread_id,
            });
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                const run = STORE.runs[runId];
                if (!run ||
                    run.run_id !== runId ||
                    (thread_id != null && run.thread_id !== thread_id))
                    return null;
                if (filters != null) {
                    const thread = STORE.threads[run.thread_id];
                    if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters))
                        return null;
                }
                return run;
            }));
        });
    }
    static delete(run_id, thread_id, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:delete", {
                run_id,
                thread_id,
            });
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                const run = STORE.runs[run_id];
                if (!run || (thread_id != null && run.thread_id !== thread_id))
                    throw new http_exception_1.HTTPException(404, { message: "Run not found" });
                if (filters != null) {
                    const thread = STORE.threads[run.thread_id];
                    if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                        throw new http_exception_1.HTTPException(404, { message: "Run not found" });
                    }
                }
                if (thread_id != null)
                    checkpoint_1.checkpointer.delete(thread_id, run_id);
                delete STORE.runs[run_id];
                return run.run_id;
            }));
        });
    }
    static wait(runId, threadId, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const runStream = Runs.Stream.join(runId, threadId, { ignore404: threadId == null, lastEventId: undefined }, auth);
            const lastChunk = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var _a, e_2, _b, _c;
                try {
                    let lastChunk = null;
                    try {
                        for (var _d = true, runStream_1 = __asyncValues(runStream), runStream_1_1; runStream_1_1 = yield runStream_1.next(), _a = runStream_1_1.done, !_a; _d = true) {
                            _c = runStream_1_1.value;
                            _d = false;
                            const { event, data } = _c;
                            if (event === "values") {
                                lastChunk = data;
                            }
                            else if (event === "error") {
                                lastChunk = { __error__: (0, serde_1.serializeError)(data) };
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = runStream_1.return)) yield _b.call(runStream_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    resolve(lastChunk);
                }
                catch (error) {
                    reject(error);
                }
            }));
            return lastChunk;
        });
    }
    static join(runId, threadId, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // check if thread exists
            yield Threads.get(threadId, auth);
            const lastChunk = yield Runs.wait(runId, threadId, auth);
            if (lastChunk != null)
                return lastChunk;
            const thread = yield Threads.get(threadId, auth);
            return (_a = thread.values) !== null && _a !== void 0 ? _a : null;
        });
    }
    static cancel(threadId, runIds, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const action = (_a = options.action) !== null && _a !== void 0 ? _a : "interrupt";
                const promises = [];
                const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:update", {
                    thread_id: threadId,
                    action,
                    metadata: { run_ids: runIds, status: "pending" },
                });
                let foundRunsCount = 0;
                for (const runId of runIds) {
                    const run = STORE.runs[runId];
                    if (!run || (threadId != null && run.thread_id !== threadId))
                        continue;
                    if (filters != null) {
                        const thread = STORE.threads[run.thread_id];
                        if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters))
                            continue;
                    }
                    foundRunsCount += 1;
                    // send cancellation message
                    const control = exports.StreamManager.getControl(runId);
                    control === null || control === void 0 ? void 0 : control.abort((_b = options.action) !== null && _b !== void 0 ? _b : "interrupt");
                    if (run.status === "pending") {
                        if (control || action !== "rollback") {
                            run.status = "interrupted";
                            run.updated_at = new Date();
                            const thread = STORE.threads[run.thread_id];
                            if (thread) {
                                thread.status = "idle";
                                thread.updated_at = new Date();
                            }
                        }
                        else {
                            logging_1.logger.info("Eagerly deleting unscheduled run with rollback action", {
                                run_id: runId,
                                thread_id: threadId,
                            });
                            promises.push(Runs.delete(runId, threadId, auth));
                        }
                    }
                    else {
                        logging_1.logger.warn("Attempted to cancel non-pending run.", {
                            run_id: runId,
                            status: run.status,
                        });
                    }
                }
                yield Promise.all(promises);
                if (foundRunsCount === runIds.length) {
                    logging_1.logger.info("Cancelled runs", {
                        run_ids: runIds,
                        thread_id: threadId,
                        action,
                    });
                }
                else {
                    throw new http_exception_1.HTTPException(404, { message: "Run not found" });
                }
            }));
        });
    }
    static search(threadId, options, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const [filters] = yield (0, custom_1.handleAuthEvent)(auth, "threads:search", {
                thread_id: threadId,
                metadata: options.metadata,
                status: options.status,
            });
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const runs = Object.values(STORE.runs).filter((run) => {
                    if (run.thread_id !== threadId)
                        return false;
                    if ((options === null || options === void 0 ? void 0 : options.status) != null && run.status !== options.status)
                        return false;
                    if ((options === null || options === void 0 ? void 0 : options.metadata) != null &&
                        !isJsonbContained(run.metadata, options.metadata))
                        return false;
                    if (filters != null) {
                        const thread = STORE.threads[run.thread_id];
                        if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters))
                            return false;
                    }
                    return true;
                });
                return runs.slice((_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : 0, (_b = options === null || options === void 0 ? void 0 : options.limit) !== null && _b !== void 0 ? _b : 10);
            }));
        });
    }
    static setStatus(runId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return exports.conn.with((STORE) => __awaiter(this, void 0, void 0, function* () {
                const run = STORE.runs[runId];
                if (!run)
                    throw new Error(`Run ${runId} not found`);
                run.status = status;
                run.updated_at = new Date();
            }));
        });
    }
}
exports.Runs = Runs;
Runs.Stream = class {
    static join(runId, threadId, options, auth) {
        return __asyncGenerator(this, arguments, function* join_1() {
            yield __await(yield* __asyncDelegator(__asyncValues(exports.conn.withGenerator(function (STORE) {
                return __asyncGenerator(this, arguments, function* () {
                    // TODO: what if we're joining an already completed run? Should we check before?
                    const signal = options === null || options === void 0 ? void 0 : options.cancelOnDisconnect;
                    const queue = exports.StreamManager.getQueue(runId, {
                        ifNotFound: "create",
                        resumable: options.lastEventId != null,
                    });
                    const [filters] = yield __await((0, custom_1.handleAuthEvent)(auth, "threads:read", {
                        thread_id: threadId,
                    }));
                    // TODO: consolidate into a single function
                    if (filters != null && threadId != null) {
                        const thread = STORE.threads[threadId];
                        if (!(0, custom_1.isAuthMatching)(thread["metadata"], filters)) {
                            yield yield __await({
                                event: "error",
                                data: { error: "Error", message: "404: Thread not found" },
                            });
                            return yield __await(void 0);
                        }
                    }
                    let lastEventId = options === null || options === void 0 ? void 0 : options.lastEventId;
                    while (!(signal === null || signal === void 0 ? void 0 : signal.aborted)) {
                        try {
                            const [id, message] = yield __await(queue.get({
                                timeout: 500,
                                signal,
                                lastEventId,
                            }));
                            lastEventId = id;
                            if (message.topic === `run:${runId}:control`) {
                                if (message.data === "done")
                                    break;
                            }
                            else {
                                const streamTopic = message.topic.substring(`run:${runId}:stream:`.length);
                                yield yield __await({ id, event: streamTopic, data: message.data });
                            }
                        }
                        catch (error) {
                            if (error instanceof AbortError)
                                break;
                            const run = yield __await(Runs.get(runId, threadId, auth));
                            if (run == null) {
                                if (!(options === null || options === void 0 ? void 0 : options.ignore404))
                                    yield yield __await({ event: "error", data: "Run not found" });
                                break;
                            }
                            else if (run.status !== "pending" && run.status !== "running") {
                                break;
                            }
                        }
                    }
                    if ((signal === null || signal === void 0 ? void 0 : signal.aborted) && threadId != null) {
                        yield __await(Runs.cancel(threadId, [runId], { action: "interrupt" }, auth));
                    }
                });
            }))));
        });
    }
    static publish(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = exports.StreamManager.getQueue(payload.runId, {
                ifNotFound: "create",
                resumable: payload.resumable,
            });
            queue.push({
                topic: `run:${payload.runId}:stream:${payload.event}`,
                data: payload.data,
            });
        });
    }
};
class Crons {
}
exports.Crons = Crons;
