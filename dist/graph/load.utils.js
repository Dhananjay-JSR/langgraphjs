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
exports.NAMESPACE_GRAPH = exports.GRAPHS = void 0;
exports.resolveGraph = resolveGraph;
const uuid = __importStar(require("uuid"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs/promises"));
const node_url_1 = require("node:url");
exports.GRAPHS = {};
exports.NAMESPACE_GRAPH = uuid.parse("6ba7b821-9dad-11d1-80b4-00c04fd430c8");
function resolveGraph(spec, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [userFile, exportSymbol] = spec.split(":", 2);
        const sourceFile = path.resolve(options.cwd, userFile);
        // validate file exists
        yield fs.stat(sourceFile);
        if (options === null || options === void 0 ? void 0 : options.onlyFilePresence) {
            return { sourceFile, exportSymbol, resolved: undefined };
        }
        const isGraph = (graph) => {
            if (typeof graph !== "object" || graph == null)
                return false;
            return "compile" in graph && typeof graph.compile === "function";
        };
        const graph = yield Promise.resolve(`${(0, node_url_1.pathToFileURL)(sourceFile).toString()}`).then(s => __importStar(require(s))).then((module) => module[exportSymbol || "default"]);
        // obtain the graph, and if not compiled, compile it
        const resolved = yield (() => __awaiter(this, void 0, void 0, function* () {
            if (!graph)
                throw new Error("Failed to load graph: graph is nullush");
            const afterResolve = (graphLike) => {
                const graph = isGraph(graphLike) ? graphLike.compile() : graphLike;
                return graph;
            };
            if (typeof graph === "function") {
                return (config) => __awaiter(this, void 0, void 0, function* () {
                    const graphLike = yield graph(config);
                    return afterResolve(graphLike);
                });
            }
            return afterResolve(yield graph);
        }))();
        return { sourceFile, exportSymbol, resolved };
    });
}
