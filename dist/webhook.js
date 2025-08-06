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
exports.callWebhook = callWebhook;
const serde_1 = require("./utils/serde");
const loopback_1 = require("./loopback");
function callWebhook(result) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const payload = Object.assign(Object.assign(Object.assign({}, result.run), { status: result.status, run_started_at: result.run_started_at.toISOString(), run_ended_at: (_a = result.run_ended_at) === null || _a === void 0 ? void 0 : _a.toISOString(), webhook_sent_at: new Date().toISOString(), values: (_b = result.checkpoint) === null || _b === void 0 ? void 0 : _b.values }), (result.exception
            ? { error: (0, serde_1.serializeError)(result.exception).message }
            : undefined));
        if (result.webhook.startsWith("/")) {
            const fetch = (0, loopback_1.getLoopbackFetch)();
            if (!fetch)
                throw new Error("Loopback fetch is not bound");
            yield fetch(result.webhook, {
                method: "POST",
                body: JSON.stringify(payload),
            });
        }
        else {
            yield fetch(result.webhook, {
                method: "POST",
                body: JSON.stringify(payload),
            });
        }
    });
}
