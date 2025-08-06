import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { registerFromEnv, registerGraphFromReference } from "./graph/load";

import runs from "./api/runs";
import threads from "./api/threads";
import assistants from "./api/assistants";
import store from "./api/store";
import meta from "./api/meta";
import {api, registerGraphUi} from "./ui/load";

import { truncate, conn as opsConn } from "./storage/ops";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { queue } from "./queue";
import {
  logger,
  requestLogger,
  registerRuntimeLogFormatter,
  registerSdkLogger,
} from "./logging";
import { checkpointer } from "./storage/checkpoint";
import { store as graphStore } from "./storage/store";
import { auth } from "./auth/custom";
import { registerAuth } from "./auth/index";
import { registerHttp } from "./http/custom";
import { cors, ensureContentType } from "./http/middleware";
import { bindLoopbackFetch } from "./loopback";
import { checkLangGraphSemver } from "./semver/index";
import { CompiledGraph, getConfig, LangGraphRunnableConfig } from "@langchain/langgraph";
import { CompiledGraphFactory } from "./graph/load.utils";

export const StartServerSchema = z.object({
  port: z.number(),
  nWorkers: z.number(),
  host: z.string(),
  cwd: z.string(),
  graphs: z.record(z.string()),
  auth: z
    .object({
      path: z.string().optional(),
      disable_studio_auth: z.boolean().default(false),
    })
    .optional(),
  ui: z.record(z.string()).optional(),
  ui_config: z.object({ shared: z.array(z.string()).optional() }).optional(),
  http: z
    .object({
      app: z.string().optional(),
      disable_assistants: z.boolean().default(false),
      disable_threads: z.boolean().default(false),
      disable_runs: z.boolean().default(false),
      disable_store: z.boolean().default(false),
      disable_meta: z.boolean().default(false),
      cors: z
        .object({
          allow_origins: z.array(z.string()).optional(),
          allow_methods: z.array(z.string()).optional(),
          allow_headers: z.array(z.string()).optional(),
          allow_credentials: z.boolean().optional(),
          allow_origin_regex: z.string().optional(),
          expose_headers: z.array(z.string()).optional(),
          max_age: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function startServerWithNew({
  registerGraphs,
  config,
  serverConfig
}: {
  registerGraphs: {
    sourceFile: string;
    graph: CompiledGraph<string> | CompiledGraphFactory<string>;
    exportSymbol: string;
  }
  serverConfig: {
    port: number;
    host: string;
    workers: number;
  }
  config: LangGraphRunnableConfig;
}) {
  const currentDir = process.cwd();
  const semver = await checkLangGraphSemver();
  const invalidPackages = semver.filter((s) => !s.satisfies);
  if (invalidPackages.length > 0) {
    logger.warn(
      `Some LangGraph.js dependencies are not up to date. Please make sure to update them to the required version.`,
      Object.fromEntries(
        invalidPackages.map(({ name, version, required }) => [
          name,
          { version, required },
        ])
      )
    );
  }

  logger.info(`Initializing storage...`);
  const callbacks = await Promise.all([
    opsConn.initialize(currentDir),
    checkpointer.initialize(currentDir),
    graphStore.initialize(currentDir),
  ]);



  const cleanup = async () => {
    logger.info(`Flushing to persistent storage, exiting...`);
    await Promise.all(callbacks.map((c:any) => c.flush()));
  };

  // Register global logger that can be consumed via SDK
  // We need to do this before we load the graphs in-case the logger is obtained at top-level.
  registerSdkLogger();

    await registerGraphFromReference({
      registerGraphs,
      config,
    });

  registerRuntimeLogFormatter((info) => {
    const config = getConfig();
    if (config == null) return info;

    const node = config.metadata?.["langgraph_node"];
    if (node != null) info.langgraph_node = node;

    return info;
  });

  const app = new Hono();

  // Loopback fetch used by webhooks and custom routes
  bindLoopbackFetch(app);

  app.post(
    "/internal/truncate",
    zValidator(
      "json",
      z.object({
        runs: z.boolean().optional(),
        threads: z.boolean().optional(),
        assistants: z.boolean().optional(),
        checkpointer: z.boolean().optional(),
        store: z.boolean().optional(),
      })
    ),
    (c) => {
      const { runs, threads, assistants, checkpointer, store } =
        c.req.valid("json");

      truncate({ runs, threads, assistants, checkpointer, store });
      return c.json({ ok: true });
    }
  );

  app.use(cors({
    allow_origins: ['https://smith.langchain.com'],
    allow_methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // allow_headers: ['Content-Type', 'Authorization'],
    // allow_credentials: true,
    // expose_headers: ['Content-Type', 'Authorization'],
    // max_age: 600,
  })
);
  app.use(requestLogger());

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

  app.use(ensureContentType());

  if (true) app.route("/", meta);
  if (true) app.route("/", assistants);
  if (true) app.route("/", runs);
  if (true) app.route("/", threads);
  if (true) app.route("/", store);

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
  logger.info(`Starting ${worker} workers`);
  for (let i = 0; i < worker; i++) queue();

  return new Promise<{ host: string; cleanup: () => Promise<void> }>(
    (resolve) => {
      serve(
        { fetch: app.fetch, port: serverConfig.port, hostname: serverConfig.host },
        (c) => {
          resolve({ host: `${c.address}:${c.port}`, cleanup });
        }
      );
    }
  );
}

export async function startServer(options: z.infer<typeof StartServerSchema>) {
  const semver = await checkLangGraphSemver();
  const invalidPackages = semver.filter((s) => !s.satisfies);
  if (invalidPackages.length > 0) {
    logger.warn(
      `Some LangGraph.js dependencies are not up to date. Please make sure to update them to the required version.`,
      Object.fromEntries(
        invalidPackages.map(({ name, version, required }) => [
          name,
          { version, required },
        ])
      )
    );
  }

  logger.info(`Initializing storage...`);
  const callbacks = await Promise.all([
    opsConn.initialize(options.cwd),
    checkpointer.initialize(options.cwd),
    graphStore.initialize(options.cwd),
  ]);

  const cleanup = async () => {
    logger.info(`Flushing to persistent storage, exiting...`);
    await Promise.all(callbacks.map((c:any) => c.flush()));
  };

  // Register global logger that can be consumed via SDK
  // We need to do this before we load the graphs in-case the logger is obtained at top-level.
  registerSdkLogger();

  logger.info(`Registering graphs from ${options.cwd}`);
  await registerFromEnv(options.graphs, { cwd: options.cwd });

  registerRuntimeLogFormatter((info) => {
    const config = getConfig();
    if (config == null) return info;

    const node = config.metadata?.["langgraph_node"];
    if (node != null) info.langgraph_node = node;

    return info;
  });

  const app = new Hono();

  // Loopback fetch used by webhooks and custom routes
  bindLoopbackFetch(app);

  app.post(
    "/internal/truncate",
    zValidator(
      "json",
      z.object({
        runs: z.boolean().optional(),
        threads: z.boolean().optional(),
        assistants: z.boolean().optional(),
        checkpointer: z.boolean().optional(),
        store: z.boolean().optional(),
      })
    ),
    (c) => {
      const { runs, threads, assistants, checkpointer, store } =
        c.req.valid("json");

      truncate({ runs, threads, assistants, checkpointer, store });
      return c.json({ ok: true });
    }
  );
console.log("CORS",options.http?.cors)
  app.use(cors(options.http?.cors));
  app.use(requestLogger());

  if (options.auth?.path) {
    logger.info(`Loading auth from ${options.auth.path}`);
    await registerAuth(options.auth, { cwd: options.cwd });
    app.use(auth());
  }

  if (options.http?.app) {
    logger.info(`Loading HTTP app from ${options.http.app}`);
    const { api } = await registerHttp(options.http.app, { cwd: options.cwd });
    app.route("/", api);
  }

  app.use(ensureContentType());

  if (!options.http?.disable_meta) app.route("/", meta);
  if (!options.http?.disable_assistants) app.route("/", assistants);
  if (!options.http?.disable_runs) app.route("/", runs);
  if (!options.http?.disable_threads) app.route("/", threads);
  if (!options.http?.disable_store) app.route("/", store);

  if (options.ui) {
    logger.info(`Registering UI from ${options.cwd}`);
    // const { api, registerGraphUi } = await import("./ui/load.mjs");
    await registerGraphUi(options.ui, {
      cwd: options.cwd,
      config: options.ui_config,
    });
    app.route("/", api);
  }

  logger.info(`Starting ${options.nWorkers} workers`);
  for (let i = 0; i < options.nWorkers; i++) queue();

  return new Promise<{ host: string; cleanup: () => Promise<void> }>(
    (resolve) => {
      serve(
        { fetch: app.fetch, port: options.port, hostname: options.host },
        (c) => {
          resolve({ host: `${c.address}:${c.port}`, cleanup });
        }
      );
    }
  );
}
