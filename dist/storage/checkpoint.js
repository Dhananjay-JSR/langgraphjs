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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
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
exports.checkpointer = void 0;
const langgraph_1 = require("@langchain/langgraph");
const persist_1 = require("./persist");
const EXCLUDED_KEYS = ["checkpoint_ns", "checkpoint_id", "run_id", "thread_id"];
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const WriteKey = {
    serialize: (key) => {
        return JSON.stringify(key);
    },
    deserialize: (key) => {
        const [threadId, checkpointNamespace, checkpointId] = JSON.parse(key);
        return [threadId, checkpointNamespace, checkpointId];
    },
};
const conn = new persist_1.FileSystemPersistence(".langgraphjs_api.checkpointer.json", () => ({
    storage: {},
    writes: {},
}));
class InMemorySaver extends langgraph_1.MemorySaver {
    constructor() {
        super(); // This calls the constructor of MemorySaver
    }
    initialize(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            yield conn.initialize(cwd);
            yield conn.with(({ storage, writes }) => {
                this.storage = storage;
                this.writes = writes;
            });
            return conn;
        });
    }
    clear() {
        // { [threadId: string]: { [checkpointNs: string]: { [checkpointId]: [checkpoint, metadata, parentId] } }}
        this.storage = {};
        // { [WriteKey]: CheckpointPendingWrite[] }
        this.writes = {};
    }
    // Patch every method that has access to this.storage or this.writes
    // to also persist the changes to the filesystem in a non-blocking manner
    getTuple(...args) {
        const _super = Object.create(null, {
            getTuple: { get: () => super.getTuple }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.getTuple.call(this, ...args));
        });
    }
    list(...args) {
        const _super = Object.create(null, {
            list: { get: () => super.list }
        });
        return __asyncGenerator(this, arguments, function* list_1() {
            yield __await(yield* __asyncDelegator(__asyncValues(conn.withGenerator(_super.list.call(this, ...args)))));
        });
    }
    putWrites(...args) {
        const _super = Object.create(null, {
            putWrites: { get: () => super.putWrites }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.putWrites.call(this, ...args));
        });
    }
    put(config, checkpoint, metadata) {
        const _super = Object.create(null, {
            put: { get: () => super.put }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => {
                var _a;
                return _super.put.call(this, config, checkpoint, Object.assign(Object.assign(Object.assign({}, Object.fromEntries(Object.entries((_a = config.configurable) !== null && _a !== void 0 ? _a : {}).filter(([key]) => !key.startsWith("__") && !EXCLUDED_KEYS.includes(key)))), config.metadata), metadata));
            });
        });
    }
    delete(threadId, runId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.storage[threadId] == null)
                return;
            return yield conn.with(() => {
                if (runId != null) {
                    const writeKeysToDelete = [];
                    for (const ns of Object.keys(this.storage[threadId])) {
                        for (const id of Object.keys(this.storage[threadId][ns])) {
                            const [_checkpoint, metadata, _parentId] = this.storage[threadId][ns][id];
                            const jsonMetadata = JSON.parse(textDecoder.decode(metadata));
                            if (jsonMetadata.run_id === runId) {
                                delete this.storage[threadId][ns][id];
                                writeKeysToDelete.push(WriteKey.serialize([threadId, ns, id]));
                                if (Object.keys(this.storage[threadId][ns]).length === 0) {
                                    delete this.storage[threadId][ns];
                                }
                            }
                        }
                    }
                    for (const key of writeKeysToDelete) {
                        delete this.writes[key];
                    }
                }
                else {
                    delete this.storage[threadId];
                    // delete all writes for this thread
                    const writeKeys = Object.keys(this.writes);
                    for (const key of writeKeys) {
                        const [writeThreadId] = WriteKey.deserialize(key);
                        if (writeThreadId === threadId)
                            delete this.writes[key];
                    }
                }
            });
        });
    }
    copy(threadId, newThreadId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => {
                var _a, _b;
                // copy storage over
                const newThreadCheckpoints = {};
                for (const oldNs of Object.keys((_a = this.storage[threadId]) !== null && _a !== void 0 ? _a : {})) {
                    const newNs = oldNs.replace(threadId, newThreadId);
                    for (const oldId of Object.keys(this.storage[threadId][oldNs])) {
                        const newId = oldId.replace(threadId, newThreadId);
                        const [checkpoint, metadata, oldParentId] = this.storage[threadId][oldNs][oldId];
                        const newParentId = oldParentId === null || oldParentId === void 0 ? void 0 : oldParentId.replace(threadId, newThreadId);
                        const rawMetadata = textDecoder
                            .decode(metadata)
                            .replaceAll(threadId, newThreadId);
                        (_b = newThreadCheckpoints[newNs]) !== null && _b !== void 0 ? _b : (newThreadCheckpoints[newNs] = {});
                        newThreadCheckpoints[newNs][newId] = [
                            checkpoint,
                            textEncoder.encode(rawMetadata),
                            newParentId,
                        ];
                    }
                }
                this.storage[newThreadId] = newThreadCheckpoints;
                // copy writes over (if any)
                const outerKeys = [];
                for (const keyJson of Object.keys(this.writes)) {
                    const key = WriteKey.deserialize(keyJson);
                    if (key[0] === threadId)
                        outerKeys.push(keyJson);
                }
                for (const keyJson of outerKeys) {
                    const [_threadId, checkpointNamespace, checkpointId] = WriteKey.deserialize(keyJson);
                    this.writes[WriteKey.serialize([newThreadId, checkpointNamespace, checkpointId])] = structuredClone(this.writes[keyJson]);
                }
            });
        });
    }
    toJSON() {
        // Prevent serialization of internal state
        return "[InMemorySaver]";
    }
}
exports.checkpointer = new InMemorySaver();
