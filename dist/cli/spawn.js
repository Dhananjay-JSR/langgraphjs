"use strict";
// import { fileURLToPath } from "node:url";
// import { spawn } from "node:child_process";
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
exports.startServerWithNew = void 0;
exports.spawnServer = spawnServer;
var server_1 = require("../server");
Object.defineProperty(exports, "startServerWithNew", { enumerable: true, get: function () { return server_1.startServerWithNew; } });
function spawnServer(args, context, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const localUrl = `http://${args.host}:${args.port}`;
        const studioUrl = `${context.hostUrl}/studio?baseUrl=${localUrl}`;
        console.log(`
          Welcome to

╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴.js

- 🚀 API: \x1b[36m${localUrl}\x1b[0m
- 🎨 Studio UI: \x1b[36m${studioUrl}\x1b[0m

This in-memory server is designed for development and testing.
For production use, please use LangGraph Cloud.

`);
        // return spawn(
        //   process.execPath,
        //   [
        //     fileURLToPath(
        //       new URL("../../cli.mjs", import.meta.resolve("tsx/esm/api"))
        //     ),
        //     "watch",
        //     "--clear-screen=false",
        //     "--import",
        //     new URL(import.meta.resolve("../preload.mjs")).toString(),
        //     fileURLToPath(new URL(import.meta.resolve("./entrypoint.mjs"))),
        //     options.pid.toString(),
        //     JSON.stringify({
        //       port: Number.parseInt(args.port, 10),
        //       nWorkers: Number.parseInt(args.nJobsPerWorker, 10),
        //       host: args.host,
        //       graphs: context.config.graphs,
        //       auth: context.config.auth,
        //       ui: context.config.ui,
        //       ui_config: context.config.ui_config,
        //       cwd: options.projectCwd,
        //       http: context.config.http,
        //     }),
        //   ],
        //   {
        //     stdio: ["inherit", "inherit", "inherit", "ipc"],
        //     env: {
        //       ...context.env,
        //       NODE_ENV: "development",
        //       LANGGRAPH_API_URL: localUrl,
        //     },
        //   }
        // );
    });
}
