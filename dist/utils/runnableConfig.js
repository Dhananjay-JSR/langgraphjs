"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRunnableConfigToCheckpoint = exports.runnableConfigToCheckpoint = void 0;
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    configurable: zod_1.z.object({
        thread_id: zod_1.z.string(),
        checkpoint_id: zod_1.z.string(),
        checkpoint_ns: zod_1.z.string().nullish(),
        checkpoint_map: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
    }),
});
const runnableConfigToCheckpoint = (config) => {
    if (!config || !config.configurable || !config.configurable.thread_id) {
        return null;
    }
    const parsed = ConfigSchema.safeParse(config);
    if (!parsed.success)
        return null;
    return {
        thread_id: parsed.data.configurable.thread_id,
        checkpoint_id: parsed.data.configurable.checkpoint_id,
        checkpoint_ns: parsed.data.configurable.checkpoint_ns || "",
        checkpoint_map: parsed.data.configurable.checkpoint_map || null,
    };
};
exports.runnableConfigToCheckpoint = runnableConfigToCheckpoint;
const TaskConfigSchema = zod_1.z.object({
    configurable: zod_1.z.object({
        thread_id: zod_1.z.string(),
        checkpoint_id: zod_1.z.string().nullish(),
        checkpoint_ns: zod_1.z.string().nullish(),
        checkpoint_map: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),
    }),
});
const taskRunnableConfigToCheckpoint = (config) => {
    if (!config || !config.configurable || !config.configurable.thread_id) {
        return null;
    }
    const parsed = TaskConfigSchema.safeParse(config);
    if (!parsed.success)
        return null;
    return {
        thread_id: parsed.data.configurable.thread_id,
        checkpoint_id: parsed.data.configurable.checkpoint_id || null,
        checkpoint_ns: parsed.data.configurable.checkpoint_ns || "",
        checkpoint_map: parsed.data.configurable.checkpoint_map || null,
    };
};
exports.taskRunnableConfigToCheckpoint = taskRunnableConfigToCheckpoint;
