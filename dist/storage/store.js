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
exports.store = void 0;
const langgraph_1 = require("@langchain/langgraph");
const persist_1 = require("./persist");
const conn = new persist_1.FileSystemPersistence(".langgraphjs_api.store.json", () => ({
    data: new Map(),
    vectors: new Map(),
}));
class InMemoryStore extends langgraph_1.InMemoryStore {
    initialize(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            yield conn.initialize(cwd);
            yield conn.with(({ data, vectors }) => {
                Object.assign(this, { data, vectors });
            });
            return conn;
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield conn.with(({ data, vectors }) => {
                data.clear();
                vectors.clear();
            });
        });
    }
    batch(operations) {
        const _super = Object.create(null, {
            batch: { get: () => super.batch }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.batch.call(this, operations));
        });
    }
    get(...args
    // @ts-ignore
    ) {
        const _super = Object.create(null, {
            get: { get: () => super.get }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.get.call(this, ...args));
        });
    }
    search(...args
    // @ts-ignore
    ) {
        const _super = Object.create(null, {
            search: { get: () => super.search }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.search.call(this, ...args));
        });
    }
    put(...args
    // @ts-ignore
    ) {
        const _super = Object.create(null, {
            put: { get: () => super.put }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.put.call(this, ...args));
        });
    }
    listNamespaces(...args
    // @ts-ignore
    ) {
        const _super = Object.create(null, {
            listNamespaces: { get: () => super.listNamespaces }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield conn.with(() => _super.listNamespaces.call(this, ...args));
        });
    }
    toJSON() {
        // Prevent serialization of internal state
        return "[InMemoryStore]";
    }
}
exports.store = new InMemoryStore();
