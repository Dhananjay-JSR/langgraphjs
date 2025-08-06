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
exports.FileSystemPersistence = void 0;
exports.serialize = serialize;
exports.deserialize = deserialize;
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs/promises"));
const superjson = __importStar(require("superjson"));
const importMap = __importStar(require("./importMap"));
const load_1 = require("@langchain/core/load");
// Add custom transformers for Uint8Array
superjson.registerCustom({
    isApplicable: (v) => v instanceof Uint8Array,
    serialize: (v) => Buffer.from(v).toString("base64"),
    deserialize: (v) => new Uint8Array(Buffer.from(v, "base64")),
}, "Uint8Array");
function serialize(data) {
    return superjson.stringify(data);
}
function deserialize(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (0, load_1.load)(input, { importMap });
        return superjson.deserialize(result);
    });
}
class FileSystemPersistence {
    constructor(name, defaultSchema) {
        this.filepath = null;
        this.data = null;
        this.flushTimeout = undefined;
        this.name = name;
        this.defaultSchema = defaultSchema;
    }
    initialize(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            this.filepath = path.resolve(cwd, ".langgraph_api", `${this.name}`);
            try {
                this.data = yield deserialize(yield fs.readFile(this.filepath, "utf-8"));
            }
            catch (_a) {
                this.data = this.defaultSchema();
            }
            yield fs
                .mkdir(path.dirname(this.filepath), { recursive: true })
                .catch(() => void 0);
            return this;
        });
    }
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.data == null || this.filepath == null)
                return;
            clearTimeout(this.flushTimeout);
            yield fs.writeFile(this.filepath, serialize(this.data), "utf-8");
        });
    }
    schedulePersist() {
        clearTimeout(this.flushTimeout);
        this.flushTimeout = setTimeout(() => this.persist(), 3000);
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.persist();
        });
    }
    with(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.filepath == null || this.data == null) {
                throw new Error(`${this.name} not initialized`);
            }
            try {
                return yield fn(this.data);
            }
            finally {
                this.schedulePersist();
            }
        });
    }
    withGenerator(fn) {
        return __asyncGenerator(this, arguments, function* withGenerator_1() {
            if (this.filepath == null || this.data == null) {
                throw new Error(`${this.name} not initialized`);
            }
            let shouldPersist = false;
            let schedulePersist = () => void (shouldPersist = true);
            try {
                const gen = typeof fn === "function" ? fn(this.data, { schedulePersist }) : fn;
                yield __await(yield* __asyncDelegator(__asyncValues(gen)));
            }
            finally {
                if (shouldPersist)
                    this.schedulePersist();
            }
        });
    }
}
exports.FileSystemPersistence = FileSystemPersistence;
