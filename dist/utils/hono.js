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
exports.getDisconnectAbortSignal = void 0;
exports.jsonExtra = jsonExtra;
exports.waitKeepAlive = waitKeepAlive;
const serde_1 = require("./serde");
const streaming_1 = require("hono/streaming");
function jsonExtra(c, object) {
    c.header("Content-Type", "application/json");
    return c.body((0, serde_1.serialiseAsDict)(object));
}
function waitKeepAlive(c, promise) {
    return (0, streaming_1.stream)(c, (stream) => __awaiter(this, void 0, void 0, function* () {
        // keep sending newlines until we resolved the chunk
        let keepAlive = Promise.resolve();
        const timer = setInterval(() => {
            keepAlive = keepAlive.then(() => stream.write("\n"));
        }, 1000);
        const result = yield promise;
        clearInterval(timer);
        yield keepAlive;
        yield stream.write((0, serde_1.serialiseAsDict)(result));
    }));
}
const getDisconnectAbortSignal = (c, stream) => {
    // https://github.com/honojs/hono/issues/1770
    stream.onAbort(() => { });
    return c.req.raw.signal;
};
exports.getDisconnectAbortSignal = getDisconnectAbortSignal;
