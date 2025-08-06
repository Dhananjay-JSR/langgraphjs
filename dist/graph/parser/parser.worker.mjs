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
import { tsImport } from "tsx/esm/api";
import { parentPort } from "node:worker_threads";
parentPort === null || parentPort === void 0 ? void 0 : parentPort.on("message", (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { SubgraphExtractor } = yield tsImport("./parser.js", import.meta.url);
    const result = SubgraphExtractor.extractSchemas(payload, { strict: false });
    parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(result);
}));
