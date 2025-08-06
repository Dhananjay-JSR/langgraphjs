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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = void 0;
const ops_1 = require("./storage/ops");
const stream_1 = require("./stream");
const logging_1 = require("./logging");
const serde_1 = require("./utils/serde");
const webhook_1 = require("./webhook");
const load_1 = require("./graph/load");
const MAX_RETRY_ATTEMPTS = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const queue = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    while (true) {
        try {
            for (var _d = true, _e = (e_1 = void 0, __asyncValues(ops_1.Runs.next())), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                _c = _f.value;
                _d = false;
                const { run, attempt, signal } = _c;
                yield worker(run, attempt, signal);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // TODO: this is very suboptimal, we should implement subscription to the run
        yield sleep(1000 * Math.random());
    }
});
exports.queue = queue;
const worker = (run, attempt, signal) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_2, _b, _c;
    var _d, _e;
    const startedAt = new Date();
    let endedAt = undefined;
    let checkpoint = undefined;
    let exception = undefined;
    let status = undefined;
    const temporary = run.kwargs.temporary;
    const webhook = run.kwargs.webhook;
    logging_1.logger.info("Starting background run", {
        run_id: run.run_id,
        run_attempt: attempt,
        run_created_at: run.created_at,
        run_started_at: startedAt,
        run_queue_ms: startedAt.valueOf() - run.created_at.valueOf(),
    });
    const onCheckpoint = (value) => {
        checkpoint = value;
    };
    const onTaskResult = (result) => {
        if (checkpoint == null)
            return;
        const index = checkpoint.tasks.findIndex((task) => task.id === result.id);
        checkpoint.tasks[index] = Object.assign(Object.assign({}, checkpoint.tasks[index]), result);
    };
    try {
        if (attempt > MAX_RETRY_ATTEMPTS) {
            throw new Error(`Run ${run.run_id} exceeded max attempts`);
        }
        const runId = run.run_id;
        const resumable = (_e = (_d = run.kwargs) === null || _d === void 0 ? void 0 : _d.resumable) !== null && _e !== void 0 ? _e : false;
        try {
            const stream = (0, stream_1.streamState)(run, Object.assign({ getGraph: load_1.getGraph,
                attempt,
                signal }, (!temporary ? { onCheckpoint, onTaskResult } : undefined)));
            try {
                for (var _f = true, stream_2 = __asyncValues(stream), stream_2_1; stream_2_1 = yield stream_2.next(), _a = stream_2_1.done, !_a; _f = true) {
                    _c = stream_2_1.value;
                    _f = false;
                    const { event, data } = _c;
                    yield ops_1.Runs.Stream.publish({ runId, resumable, event, data });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_f && !_a && (_b = stream_2.return)) yield _b.call(stream_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        catch (error) {
            yield ops_1.Runs.Stream.publish({
                runId,
                resumable,
                event: "error",
                data: (0, serde_1.serializeError)(error),
            });
            throw error;
        }
        endedAt = new Date();
        logging_1.logger.info("Background run succeeded", {
            run_id: run.run_id,
            run_attempt: attempt,
            run_created_at: run.created_at,
            run_started_at: startedAt,
            run_ended_at: endedAt,
            run_exec_ms: endedAt.valueOf() - startedAt.valueOf(),
        });
        status = "success";
        yield ops_1.Runs.setStatus(run.run_id, status);
    }
    catch (error) {
        endedAt = new Date();
        if (error instanceof Error)
            exception = error;
        (0, logging_1.logError)(error, {
            prefix: "Background run failed",
            context: {
                run_id: run.run_id,
                run_attempt: attempt,
                run_created_at: run.created_at,
                run_started_at: startedAt,
                run_ended_at: endedAt,
                run_exec_ms: endedAt.valueOf() - startedAt.valueOf(),
            },
        });
        status = "error";
        yield ops_1.Runs.setStatus(run.run_id, "error");
    }
    finally {
        if (temporary) {
            yield ops_1.Threads.delete(run.thread_id, undefined);
        }
        else {
            yield ops_1.Threads.setStatus(run.thread_id, { checkpoint, exception });
        }
        if (webhook) {
            yield (0, webhook_1.callWebhook)({
                checkpoint,
                status,
                exception,
                run,
                webhook,
                run_started_at: startedAt,
                run_ended_at: endedAt,
            });
        }
    }
});
