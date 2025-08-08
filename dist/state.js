"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateSnapshotToThreadState = void 0;
const runnableConfig_1 = require("./utils/runnableConfig");
const serde_1 = require("./utils/serde");
const isStateSnapshot = (state) => {
    return "values" in state && "next" in state;
};
const stateSnapshotToThreadState = (state) => {
    return {
        values: state.values,
        next: state.next,
        tasks: state.tasks.map((task) => {
            var _a, _b;
            return ({
                id: task.id,
                name: task.name,
                error: task.error != null ? (0, serde_1.serializeError)(task.error).message : null,
                interrupts: task.interrupts,
                path: task.path,
                // TODO: too many type assertions, check if this is actually correct
                checkpoint: task.state != null && "configurable" in task.state
                    ? (_a = task.state.configurable) !== null && _a !== void 0 ? _a : null
                    : null,
                state: task.state != null && isStateSnapshot(task.state)
                    ? (0, exports.stateSnapshotToThreadState)(task.state)
                    : null,
                result: (_b = task.result) !== null && _b !== void 0 ? _b : null,
            });
        }),
        metadata: state.metadata,
        created_at: state.createdAt ? new Date(state.createdAt) : null,
        checkpoint: (0, runnableConfig_1.runnableConfigToCheckpoint)(state.config),
        parent_checkpoint: (0, runnableConfig_1.runnableConfigToCheckpoint)(state.parentConfig),
    };
};
exports.stateSnapshotToThreadState = stateSnapshotToThreadState;
