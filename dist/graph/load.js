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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssistantId = exports.NAMESPACE_GRAPH = exports.GRAPH_SCHEMA = exports.GRAPH_SPEC = exports.GRAPHS = void 0;
exports.registerGraphFromReference = registerGraphFromReference;
exports.registerFromEnv = registerFromEnv;
exports.getGraph = getGraph;
exports.getCachedStaticGraphSchema = getCachedStaticGraphSchema;
const zod_1 = require("zod");
const uuid = __importStar(require("uuid"));
const ops_1 = require("../storage/ops");
const http_exception_1 = require("hono/http-exception");
const load_utils_1 = require("./load.utils");
const index_1 = require("./parser/index");
const checkpoint_1 = require("../storage/checkpoint");
const store_1 = require("../storage/store");
const logging_1 = require("../logging");
exports.GRAPHS = {};
exports.GRAPH_SPEC = {};
exports.GRAPH_SCHEMA = {};
exports.NAMESPACE_GRAPH = uuid.parse("6ba7b821-9dad-11d1-80b4-00c04fd430c8");
const ConfigSchema = zod_1.z.record(zod_1.z.record(zod_1.z.unknown()));
const getAssistantId = (graphId) => {
    if (graphId in exports.GRAPHS)
        return uuid.v5(graphId, exports.NAMESPACE_GRAPH);
    return graphId;
};
exports.getAssistantId = getAssistantId;
function registerGraphFromReference(_a) {
    return __awaiter(this, arguments, void 0, function* ({ registerGraphs, config }) {
        const { sourceFile, graph, exportSymbol } = registerGraphs;
        exports.GRAPHS[exportSymbol] = graph;
        exports.GRAPH_SPEC[exportSymbol] = {
            sourceFile: sourceFile,
            exportSymbol: exportSymbol,
        };
        yield ops_1.Assistants.put(uuid.v5(exportSymbol, exports.NAMESPACE_GRAPH), {
            graph_id: exportSymbol,
            metadata: { created_by: "system" },
            config,
            context: {},
            if_exists: "do_nothing",
            name: exportSymbol,
        }, undefined);
        // return await Promise.all(
        //   Object.entries(registerGraphs).map(async ([graphId, compiledGraph]) => {
        //     logger.info(`Registering graph with id '${graphId}'`, {
        //       graph_id: graphId,
        //     });
        //     GRAPHS[graphId] = compiledGraph;
        //     GRAPH_SPEC[graphId] = {
        //       sourceFile: "__internal__",
        //       exportSymbol: "__internal__",
        //     };
        //     await Assistants.put(
        //       uuid.v5(graphId, NAMESPACE_GRAPH),
        //       {
        //         graph_id: graphId,
        //         metadata: { created_by: "system" },
        //         config,
        //         context: {},
        //         if_exists: "do_nothing",
        //         name: graphId,
        //       },
        //       undefined
        //     );
        //   })
        // );
    });
}
function registerFromEnv(specs, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const envConfig = process.env.LANGGRAPH_CONFIG
            ? ConfigSchema.parse(JSON.parse(process.env.LANGGRAPH_CONFIG))
            : undefined;
        return yield Promise.all(Object.entries(specs).map((_a) => __awaiter(this, [_a], void 0, function* ([graphId, rawSpec]) {
            var _b;
            logging_1.logger.info(`Registering graph with id '${graphId}'`, {
                graph_id: graphId,
            });
            const _c = (_b = envConfig === null || envConfig === void 0 ? void 0 : envConfig[graphId]) !== null && _b !== void 0 ? _b : {}, { context } = _c, config = __rest(_c, ["context"]);
            const _d = yield (0, load_utils_1.resolveGraph)(rawSpec, {
                cwd: options.cwd,
            }), { resolved } = _d, spec = __rest(_d, ["resolved"]);
            // registering the graph runtime
            exports.GRAPHS[graphId] = resolved;
            exports.GRAPH_SPEC[graphId] = spec;
            yield ops_1.Assistants.put(uuid.v5(graphId, exports.NAMESPACE_GRAPH), {
                graph_id: graphId,
                metadata: { created_by: "system" },
                config,
                context,
                if_exists: "do_nothing",
                name: graphId,
            }, undefined);
            return resolved;
        })));
    });
}
function getGraph(graphId, config, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!exports.GRAPHS[graphId])
            throw new http_exception_1.HTTPException(404, { message: `Graph "${graphId}" not found` });
        const compiled = exports.GRAPHS[graphId].compile();
        if (typeof (options === null || options === void 0 ? void 0 : options.checkpointer) !== "undefined") {
            compiled.checkpointer = (_a = options === null || options === void 0 ? void 0 : options.checkpointer) !== null && _a !== void 0 ? _a : undefined;
        }
        else {
            compiled.checkpointer = checkpoint_1.checkpointer;
        }
        compiled.store = (_b = options === null || options === void 0 ? void 0 : options.store) !== null && _b !== void 0 ? _b : store_1.store;
        return compiled;
    });
}
function getCachedStaticGraphSchema(graphId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!exports.GRAPH_SPEC[graphId])
            throw new http_exception_1.HTTPException(404, {
                message: `Spec for "${graphId}" not found`,
            });
        if (!exports.GRAPH_SCHEMA[graphId]) {
            let timeoutMs = 30000;
            try {
                const envTimeout = Number.parseInt((_a = process.env.LANGGRAPH_SCHEMA_RESOLVE_TIMEOUT_MS) !== null && _a !== void 0 ? _a : "0", 10);
                if (!Number.isNaN(envTimeout) && envTimeout > 0) {
                    timeoutMs = envTimeout;
                }
            }
            catch (_b) {
                // ignore
            }
            try {
                exports.GRAPH_SCHEMA[graphId] = yield (0, index_1.getStaticGraphSchema)(exports.GRAPH_SPEC[graphId], {
                    timeoutMs,
                });
            }
            catch (error) {
                throw new Error(`Failed to extract schema for "${graphId}"`, {
                    cause: error,
                });
            }
        }
        return exports.GRAPH_SCHEMA[graphId];
    });
}
