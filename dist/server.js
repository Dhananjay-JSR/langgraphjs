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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartServerSchema = void 0;
exports.startServerWithNew = startServerWithNew;
exports.startServer = startServer;
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const load_1 = require("./graph/load");
const runs_1 = __importDefault(require("./api/runs"));
const threads_1 = __importDefault(require("./api/threads"));
const assistants_1 = __importDefault(require("./api/assistants"));
const store_1 = __importDefault(require("./api/store"));
const meta_1 = __importDefault(require("./api/meta"));
const load_2 = require("./ui/load");
const ops_1 = require("./storage/ops");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const queue_1 = require("./queue");
const logging_1 = require("./logging");
const checkpoint_1 = require("./storage/checkpoint");
const store_2 = require("./storage/store");
const custom_1 = require("./auth/custom");
const index_1 = require("./auth/index");
const custom_2 = require("./http/custom");
const middleware_1 = require("./http/middleware");
const loopback_1 = require("./loopback");
const index_2 = require("./semver/index");
const langgraph_1 = require("@langchain/langgraph");
exports.StartServerSchema = zod_1.z.object({
    port: zod_1.z.number(),
    nWorkers: zod_1.z.number(),
    host: zod_1.z.string(),
    cwd: zod_1.z.string(),
    graphs: zod_1.z.record(zod_1.z.string()),
    auth: zod_1.z
        .object({
        path: zod_1.z.string().optional(),
        disable_studio_auth: zod_1.z.boolean().default(false),
    })
        .optional(),
    ui: zod_1.z.record(zod_1.z.string()).optional(),
    ui_config: zod_1.z.object({ shared: zod_1.z.array(zod_1.z.string()).optional() }).optional(),
    http: zod_1.z
        .object({
        app: zod_1.z.string().optional(),
        disable_assistants: zod_1.z.boolean().default(false),
        disable_threads: zod_1.z.boolean().default(false),
        disable_runs: zod_1.z.boolean().default(false),
        disable_store: zod_1.z.boolean().default(false),
        disable_meta: zod_1.z.boolean().default(false),
        cors: zod_1.z
            .object({
            allow_origins: zod_1.z.array(zod_1.z.string()).optional(),
            allow_methods: zod_1.z.array(zod_1.z.string()).optional(),
            allow_headers: zod_1.z.array(zod_1.z.string()).optional(),
            allow_credentials: zod_1.z.boolean().optional(),
            allow_origin_regex: zod_1.z.string().optional(),
            expose_headers: zod_1.z.array(zod_1.z.string()).optional(),
            max_age: zod_1.z.number().optional(),
        })
            .optional(),
    })
        .optional(),
});
function startServerWithNew(_a) {
    return __awaiter(this, arguments, void 0, function* ({ registerGraphs, config, serverConfig }) {
        const currentDir = process.cwd();
        const semver = yield (0, index_2.checkLangGraphSemver)();
        const invalidPackages = semver.filter((s) => !s.satisfies);
        if (invalidPackages.length > 0) {
            logging_1.logger.warn(`Some LangGraph.js dependencies are not up to date. Please make sure to update them to the required version.`, Object.fromEntries(invalidPackages.map(({ name, version, required }) => [
                name,
                { version, required },
            ])));
        }
        logging_1.logger.info(`Initializing storage...`);
        const callbacks = yield Promise.all([
            ops_1.conn.initialize(currentDir),
            checkpoint_1.checkpointer.initialize(currentDir),
            store_2.store.initialize(currentDir),
        ]);
        const cleanup = () => __awaiter(this, void 0, void 0, function* () {
            logging_1.logger.info(`Flushing to persistent storage, exiting...`);
            yield Promise.all(callbacks.map((c) => c.flush()));
        });
        // Register global logger that can be consumed via SDK
        // We need to do this before we load the graphs in-case the logger is obtained at top-level.
        (0, logging_1.registerSdkLogger)();
        yield (0, load_1.registerGraphFromReference)({
            registerGraphs,
            config,
        });
        (0, logging_1.registerRuntimeLogFormatter)((info) => {
            var _a;
            const config = (0, langgraph_1.getConfig)();
            if (config == null)
                return info;
            const node = (_a = config.metadata) === null || _a === void 0 ? void 0 : _a["langgraph_node"];
            if (node != null)
                info.langgraph_node = node;
            return info;
        });
        const app = new hono_1.Hono();
        // Loopback fetch used by webhooks and custom routes
        (0, loopback_1.bindLoopbackFetch)(app);
        app.post("/internal/truncate", (0, zod_validator_1.zValidator)("json", zod_1.z.object({
            runs: zod_1.z.boolean().optional(),
            threads: zod_1.z.boolean().optional(),
            assistants: zod_1.z.boolean().optional(),
            checkpointer: zod_1.z.boolean().optional(),
            store: zod_1.z.boolean().optional(),
        })), (c) => {
            const { runs, threads, assistants, checkpointer, store } = c.req.valid("json");
            (0, ops_1.truncate)({ runs, threads, assistants, checkpointer, store });
            return c.json({ ok: true });
        });
        app.use((0, middleware_1.cors)({
            allow_origins: ['https://smith.langchain.com'],
            allow_methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            // allow_headers: ['Content-Type', 'Authorization'],
            // allow_credentials: true,
            // expose_headers: ['Content-Type', 'Authorization'],
            // max_age: 600,
        }));
        app.use((0, logging_1.requestLogger)());
        // if (options.auth?.path) {
        //   logger.info(`Loading auth from ${options.auth.path}`);
        //   await registerAuth(options.auth, { cwd: options.cwd });
        //   app.use(auth());
        // }
        // if (options.http?.app) {
        //   logger.info(`Loading HTTP app from ${options.http.app}`);
        //   const { api } = await registerHttp(options.http.app, { cwd: options.cwd });
        //   app.route("/", api);
        // }
        app.use((0, middleware_1.ensureContentType)());
        if (true)
            app.route("/", meta_1.default);
        if (true)
            app.route("/", assistants_1.default);
        if (true)
            app.route("/", runs_1.default);
        if (true)
            app.route("/", threads_1.default);
        if (true)
            app.route("/", store_1.default);
        // if (true) {
        //   logger.info(`Registering UI from ${currentDir}`);
        //   // const { api, registerGraphUi } = await import("./ui/load.mjs");
        //   await registerGraphUi(true, {
        //     cwd: currentDir,
        //     config: true,
        //   });
        //   app.route("/", api);
        // }
        const worker = serverConfig.workers;
        logging_1.logger.info(`Starting ${worker} workers`);
        for (let i = 0; i < worker; i++)
            (0, queue_1.queue)();
        return new Promise((resolve) => {
            (0, node_server_1.serve)({ fetch: app.fetch, port: serverConfig.port, hostname: serverConfig.host }, (c) => {
                resolve({ host: `${c.address}:${c.port}`, cleanup });
            });
        });
    });
}
function startServer(options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const semver = yield (0, index_2.checkLangGraphSemver)();
        const invalidPackages = semver.filter((s) => !s.satisfies);
        if (invalidPackages.length > 0) {
            logging_1.logger.warn(`Some LangGraph.js dependencies are not up to date. Please make sure to update them to the required version.`, Object.fromEntries(invalidPackages.map(({ name, version, required }) => [
                name,
                { version, required },
            ])));
        }
        logging_1.logger.info(`Initializing storage...`);
        const callbacks = yield Promise.all([
            ops_1.conn.initialize(options.cwd),
            checkpoint_1.checkpointer.initialize(options.cwd),
            store_2.store.initialize(options.cwd),
        ]);
        const cleanup = () => __awaiter(this, void 0, void 0, function* () {
            logging_1.logger.info(`Flushing to persistent storage, exiting...`);
            yield Promise.all(callbacks.map((c) => c.flush()));
        });
        // Register global logger that can be consumed via SDK
        // We need to do this before we load the graphs in-case the logger is obtained at top-level.
        (0, logging_1.registerSdkLogger)();
        logging_1.logger.info(`Registering graphs from ${options.cwd}`);
        yield (0, load_1.registerFromEnv)(options.graphs, { cwd: options.cwd });
        (0, logging_1.registerRuntimeLogFormatter)((info) => {
            var _a;
            const config = (0, langgraph_1.getConfig)();
            if (config == null)
                return info;
            const node = (_a = config.metadata) === null || _a === void 0 ? void 0 : _a["langgraph_node"];
            if (node != null)
                info.langgraph_node = node;
            return info;
        });
        const app = new hono_1.Hono();
        // Loopback fetch used by webhooks and custom routes
        (0, loopback_1.bindLoopbackFetch)(app);
        app.post("/internal/truncate", (0, zod_validator_1.zValidator)("json", zod_1.z.object({
            runs: zod_1.z.boolean().optional(),
            threads: zod_1.z.boolean().optional(),
            assistants: zod_1.z.boolean().optional(),
            checkpointer: zod_1.z.boolean().optional(),
            store: zod_1.z.boolean().optional(),
        })), (c) => {
            const { runs, threads, assistants, checkpointer, store } = c.req.valid("json");
            (0, ops_1.truncate)({ runs, threads, assistants, checkpointer, store });
            return c.json({ ok: true });
        });
        console.log("CORS", (_a = options.http) === null || _a === void 0 ? void 0 : _a.cors);
        app.use((0, middleware_1.cors)((_b = options.http) === null || _b === void 0 ? void 0 : _b.cors));
        app.use((0, logging_1.requestLogger)());
        if ((_c = options.auth) === null || _c === void 0 ? void 0 : _c.path) {
            logging_1.logger.info(`Loading auth from ${options.auth.path}`);
            yield (0, index_1.registerAuth)(options.auth, { cwd: options.cwd });
            app.use((0, custom_1.auth)());
        }
        if ((_d = options.http) === null || _d === void 0 ? void 0 : _d.app) {
            logging_1.logger.info(`Loading HTTP app from ${options.http.app}`);
            const { api } = yield (0, custom_2.registerHttp)(options.http.app, { cwd: options.cwd });
            app.route("/", api);
        }
        app.use((0, middleware_1.ensureContentType)());
        if (!((_e = options.http) === null || _e === void 0 ? void 0 : _e.disable_meta))
            app.route("/", meta_1.default);
        if (!((_f = options.http) === null || _f === void 0 ? void 0 : _f.disable_assistants))
            app.route("/", assistants_1.default);
        if (!((_g = options.http) === null || _g === void 0 ? void 0 : _g.disable_runs))
            app.route("/", runs_1.default);
        if (!((_h = options.http) === null || _h === void 0 ? void 0 : _h.disable_threads))
            app.route("/", threads_1.default);
        if (!((_j = options.http) === null || _j === void 0 ? void 0 : _j.disable_store))
            app.route("/", store_1.default);
        if (options.ui) {
            logging_1.logger.info(`Registering UI from ${options.cwd}`);
            // const { api, registerGraphUi } = await import("./ui/load.mjs");
            yield (0, load_2.registerGraphUi)(options.ui, {
                cwd: options.cwd,
                config: options.ui_config,
            });
            app.route("/", load_2.api);
        }
        logging_1.logger.info(`Starting ${options.nWorkers} workers`);
        for (let i = 0; i < options.nWorkers; i++)
            (0, queue_1.queue)();
        return new Promise((resolve) => {
            (0, node_server_1.serve)({ fetch: app.fetch, port: options.port, hostname: options.host }, (c) => {
                resolve({ host: `${c.address}:${c.port}`, cleanup });
            });
        });
    });
}
