"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coercedBoolean = exports.StoreGetItem = exports.StoreDeleteItem = exports.StorePutItem = exports.StoreSearchItems = exports.StoreListNamespaces = exports.AssistantLatestVersion = exports.ThreadPatchRequest = exports.ThreadHistoryRequest = exports.ThreadStateUpdate = exports.ThreadStateSearch = exports.ThreadStatePatch = exports.ThreadState = exports.ThreadPatch = exports.ThreadCreate = exports.Thread = exports.ThreadSearchRequest = exports.AssistantSearchRequest = exports.SearchResult = exports.RunBatchCreate = exports.RunCreate = exports.LangsmithTracer = exports.CommandSchema = exports.Run = exports.GraphSchema = exports.CronSearch = exports.CronCreate = exports.CheckpointSchema = exports.Cron = exports.Config = exports.AssistantPatch = exports.AssistantCreate = exports.Assistant = exports.AssistantConfig = exports.AssistantConfigurable = void 0;
const zod_1 = require("zod");
exports.AssistantConfigurable = zod_1.z
    .object({
    thread_id: zod_1.z.string().optional(),
    thread_ts: zod_1.z.string().optional(),
})
    .catchall(zod_1.z.unknown());
exports.AssistantConfig = zod_1.z
    .object({
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    recursion_limit: zod_1.z.number().int().optional(),
    configurable: exports.AssistantConfigurable.optional(),
})
    .catchall(zod_1.z.unknown())
    .describe("The configuration of an assistant.");
exports.Assistant = zod_1.z.object({
    assistant_id: zod_1.z.string().uuid(),
    graph_id: zod_1.z.string(),
    config: exports.AssistantConfig,
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    metadata: zod_1.z.object({}).catchall(zod_1.z.any()),
});
exports.AssistantCreate = zod_1.z
    .object({
    assistant_id: zod_1.z
        .string()
        .uuid()
        .describe("The ID of the assistant. If not provided, an ID is generated.")
        .optional(),
    graph_id: zod_1.z.string().describe("The graph to use."),
    config: exports.AssistantConfig.optional(),
    context: zod_1.z.unknown().optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.unknown())
        .describe("Metadata for the assistant.")
        .optional(),
    if_exists: zod_1.z
        .union([zod_1.z.literal("raise"), zod_1.z.literal("do_nothing")])
        .optional(),
    name: zod_1.z.string().optional(),
})
    .describe("Payload for creating an assistant.");
exports.AssistantPatch = zod_1.z
    .object({
    graph_id: zod_1.z.string().describe("The graph to use.").optional(),
    config: exports.AssistantConfig.optional(),
    context: zod_1.z.unknown().optional(),
    name: zod_1.z.string().optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata to merge with existing assistant metadata.")
        .optional(),
})
    .describe("Payload for updating an assistant.");
exports.Config = zod_1.z.object({
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    recursion_limit: zod_1.z.number().int().optional(),
    configurable: zod_1.z.object({}).catchall(zod_1.z.any()).optional(),
});
exports.Cron = zod_1.z.object({
    cron_id: zod_1.z.string().uuid(),
    thread_id: zod_1.z.string().uuid(),
    end_time: zod_1.z.string(),
    schedule: zod_1.z.string(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    payload: zod_1.z.object({}).catchall(zod_1.z.any()),
});
exports.CheckpointSchema = zod_1.z.object({
    checkpoint_id: zod_1.z.string().uuid().optional(),
    checkpoint_ns: zod_1.z.string().nullish(),
    checkpoint_map: zod_1.z.record(zod_1.z.unknown()).nullish(),
});
exports.CronCreate = zod_1.z
    .object({
    thread_id: zod_1.z.string().uuid(),
    assistant_id: zod_1.z.string().uuid(),
    checkpoint_id: zod_1.z.string().optional(),
    input: zod_1.z
        .union([
        zod_1.z.array(zod_1.z.object({}).catchall(zod_1.z.any())),
        zod_1.z.object({}).catchall(zod_1.z.any()),
    ])
        .optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata for the run.")
        .optional(),
    config: exports.AssistantConfig.optional(),
    context: zod_1.z.unknown().optional(),
    webhook: zod_1.z.string().optional(),
    interrupt_before: zod_1.z.union([zod_1.z.enum(["*"]), zod_1.z.array(zod_1.z.string())]).optional(),
    interrupt_after: zod_1.z.union([zod_1.z.enum(["*"]), zod_1.z.array(zod_1.z.string())]).optional(),
    multitask_strategy: zod_1.z
        .enum(["reject", "rollback", "interrupt", "enqueue"])
        .optional(),
})
    .describe("Payload for creating a cron.");
exports.CronSearch = zod_1.z
    .object({
    assistant_id: zod_1.z.string().uuid().optional(),
    thread_id: zod_1.z.string().uuid().optional(),
    limit: zod_1.z
        .number()
        .int()
        .gte(1)
        .lte(1000)
        .describe("Maximum number to return.")
        .optional(),
    offset: zod_1.z
        .number()
        .int()
        .gte(0)
        .describe("Offset to start from.")
        .optional(),
})
    .describe("Payload for listing crons");
exports.GraphSchema = zod_1.z.object({
    graph_id: zod_1.z.string(),
    input_schema: zod_1.z.object({}).catchall(zod_1.z.any()).optional(),
    output_schema: zod_1.z.object({}).catchall(zod_1.z.any()).optional(),
    state_schema: zod_1.z.object({}).catchall(zod_1.z.any()),
    config_schema: zod_1.z.object({}).catchall(zod_1.z.any()),
});
exports.Run = zod_1.z.object({
    run_id: zod_1.z.string().uuid(),
    thread_id: zod_1.z.string().uuid(),
    assistant_id: zod_1.z.string().uuid(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    status: zod_1.z.enum([
        "pending",
        "running",
        "error",
        "success",
        "timeout",
        "interrupted",
    ]),
    metadata: zod_1.z.object({}).catchall(zod_1.z.any()),
    kwargs: zod_1.z.object({}).catchall(zod_1.z.any()),
    multitask_strategy: zod_1.z.enum(["reject", "rollback", "interrupt", "enqueue"]),
});
exports.CommandSchema = zod_1.z.object({
    goto: zod_1.z
        .union([
        zod_1.z.union([
            zod_1.z.string(),
            zod_1.z.object({ node: zod_1.z.string(), input: zod_1.z.unknown().optional() }),
        ]),
        zod_1.z.array(zod_1.z.union([
            zod_1.z.string(),
            zod_1.z.object({ node: zod_1.z.string(), input: zod_1.z.unknown().optional() }),
        ])),
    ])
        .optional(),
    update: zod_1.z
        .union([zod_1.z.record(zod_1.z.unknown()), zod_1.z.array(zod_1.z.tuple([zod_1.z.string(), zod_1.z.unknown()]))])
        .optional(),
    resume: zod_1.z.unknown().optional(),
});
exports.LangsmithTracer = zod_1.z.object({
    project_name: zod_1.z.string().optional(),
    example_id: zod_1.z.string().optional(),
});
exports.RunCreate = zod_1.z
    .object({
    assistant_id: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string()]),
    checkpoint_id: zod_1.z.string().optional(),
    checkpoint: exports.CheckpointSchema.optional(),
    input: zod_1.z.union([zod_1.z.unknown(), zod_1.z.null()]).optional(),
    command: exports.CommandSchema.optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata for the run.")
        .optional(),
    context: zod_1.z.unknown().optional(),
    config: exports.AssistantConfig.optional(),
    webhook: zod_1.z.string().optional(),
    interrupt_before: zod_1.z.union([zod_1.z.enum(["*"]), zod_1.z.array(zod_1.z.string())]).optional(),
    interrupt_after: zod_1.z.union([zod_1.z.enum(["*"]), zod_1.z.array(zod_1.z.string())]).optional(),
    on_disconnect: zod_1.z
        .enum(["cancel", "continue"])
        .optional()
        .default("continue"),
    multitask_strategy: zod_1.z
        .enum(["reject", "rollback", "interrupt", "enqueue"])
        .optional(),
    stream_mode: zod_1.z
        .union([
        zod_1.z.array(zod_1.z.enum([
            "values",
            "messages",
            "messages-tuple",
            "updates",
            "events",
            "tasks",
            "checkpoints",
            "debug",
            "custom",
        ])),
        zod_1.z.enum([
            "values",
            "messages",
            "messages-tuple",
            "updates",
            "events",
            "tasks",
            "checkpoints",
            "debug",
            "custom",
        ]),
    ])
        .optional(),
    stream_subgraphs: zod_1.z.boolean().optional(),
    stream_resumable: zod_1.z.boolean().optional(),
    after_seconds: zod_1.z.number().optional(),
    if_not_exists: zod_1.z.enum(["reject", "create"]).optional(),
    on_completion: zod_1.z.enum(["delete", "keep"]).optional(),
    feedback_keys: zod_1.z.array(zod_1.z.string()).optional(),
    langsmith_tracer: exports.LangsmithTracer.optional(),
})
    .describe("Payload for creating a stateful run.");
exports.RunBatchCreate = zod_1.z
    .array(exports.RunCreate)
    .min(1)
    .describe("Payload for creating a batch of runs.");
exports.SearchResult = zod_1.z
    .object({
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata to search for.")
        .optional(),
    limit: zod_1.z
        .number()
        .int()
        .gte(1)
        .lte(1000)
        .describe("Maximum number to return.")
        .optional(),
    offset: zod_1.z
        .number()
        .int()
        .gte(0)
        .describe("Offset to start from.")
        .optional(),
})
    .describe("Payload for listing runs.");
exports.AssistantSearchRequest = zod_1.z
    .object({
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata to search for.")
        .optional(),
    graph_id: zod_1.z.string().describe("Filter by graph ID.").optional(),
    limit: zod_1.z
        .number()
        .int()
        .gte(1)
        .lte(1000)
        .describe("Maximum number to return.")
        .optional(),
    offset: zod_1.z
        .number()
        .int()
        .gte(0)
        .describe("Offset to start from.")
        .optional(),
})
    .describe("Payload for listing assistants.");
exports.ThreadSearchRequest = zod_1.z
    .object({
    metadata: zod_1.z
        .record(zod_1.z.unknown())
        .describe("Metadata to search for.")
        .optional(),
    status: zod_1.z
        .enum(["idle", "busy", "interrupted", "error"])
        .describe("Filter by thread status.")
        .optional(),
    values: zod_1.z
        .record(zod_1.z.unknown())
        .describe("Filter by thread values.")
        .optional(),
    limit: zod_1.z
        .number()
        .int()
        .gte(1)
        .lte(1000)
        .describe("Maximum number to return.")
        .optional(),
    offset: zod_1.z
        .number()
        .int()
        .gte(0)
        .describe("Offset to start from.")
        .optional(),
    sort_by: zod_1.z
        .enum(["thread_id", "status", "created_at", "updated_at"])
        .describe("Sort by field.")
        .optional(),
    sort_order: zod_1.z.enum(["asc", "desc"]).describe("Sort order.").optional(),
})
    .describe("Payload for listing threads.");
exports.Thread = zod_1.z.object({
    thread_id: zod_1.z.string().uuid(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    status: zod_1.z.enum(["idle", "busy", "interrupted", "error"]).optional(),
});
exports.ThreadCreate = zod_1.z
    .object({
    supersteps: zod_1.z
        .array(zod_1.z.object({
        updates: zod_1.z.array(zod_1.z.object({
            values: zod_1.z.unknown().nullish(),
            command: exports.CommandSchema.nullish(),
            as_node: zod_1.z.string(),
        })),
    }))
        .describe("The supersteps to apply to the thread.")
        .optional(),
    thread_id: zod_1.z
        .string()
        .uuid()
        .describe("The ID of the thread. If not provided, an ID is generated.")
        .optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata for the thread.")
        .optional(),
    if_exists: zod_1.z
        .union([zod_1.z.literal("raise"), zod_1.z.literal("do_nothing")])
        .optional(),
})
    .describe("Payload for creating a thread.");
exports.ThreadPatch = zod_1.z
    .object({
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Metadata to merge with existing thread metadata.")
        .optional(),
})
    .describe("Payload for patching a thread.");
exports.ThreadState = zod_1.z.object({
    values: zod_1.z.union([
        zod_1.z.array(zod_1.z.object({}).catchall(zod_1.z.any())),
        zod_1.z.object({}).catchall(zod_1.z.any()),
    ]),
    next: zod_1.z.array(zod_1.z.string()),
    checkpoint_id: zod_1.z.string(),
    metadata: zod_1.z.object({}).catchall(zod_1.z.any()),
    created_at: zod_1.z.string(),
    parent_checkpoint_id: zod_1.z.string(),
});
exports.ThreadStatePatch = zod_1.z
    .object({ metadata: zod_1.z.object({}).catchall(zod_1.z.any()) })
    .describe("Payload for patching state of a thread.");
exports.ThreadStateSearch = zod_1.z.object({
    limit: zod_1.z
        .number()
        .int()
        .gte(1)
        .lte(1000)
        .describe("The maximum number of states to return.")
        .optional(),
    before: zod_1.z
        .string()
        .describe("Return states before this checkpoint ID.")
        .optional(),
    metadata: zod_1.z
        .object({})
        .catchall(zod_1.z.any())
        .describe("Filter states by metadata key-value pairs.")
        .optional(),
});
exports.ThreadStateUpdate = zod_1.z
    .object({
    values: zod_1.z
        .union([
        zod_1.z.array(zod_1.z.object({}).catchall(zod_1.z.any())),
        zod_1.z.object({}).catchall(zod_1.z.any()),
        zod_1.z.null(),
    ])
        .optional(),
    checkpoint_id: zod_1.z.string().optional(),
    as_node: zod_1.z.string().optional(),
})
    .describe("Payload for adding state to a thread.");
exports.ThreadHistoryRequest = zod_1.z.object({
    limit: zod_1.z.number().optional().default(10),
    before: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    checkpoint: zod_1.z
        .object({
        checkpoint_id: zod_1.z.string().uuid().optional(),
        checkpoint_ns: zod_1.z.string().optional(),
        checkpoint_map: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })
        .optional(),
});
exports.ThreadPatchRequest = zod_1.z.object({
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.AssistantLatestVersion = zod_1.z.object({
    version: zod_1.z.number(),
});
exports.StoreListNamespaces = zod_1.z.object({
    prefix: zod_1.z.array(zod_1.z.string()).optional(),
    suffix: zod_1.z.array(zod_1.z.string()).optional(),
    max_depth: zod_1.z.number().optional(),
    limit: zod_1.z.number().default(100).optional(),
    offset: zod_1.z.number().default(0).optional(),
});
exports.StoreSearchItems = zod_1.z.object({
    namespace_prefix: zod_1.z.array(zod_1.z.string()),
    filter: zod_1.z.record(zod_1.z.unknown()).optional(),
    limit: zod_1.z.number().default(10).optional(),
    offset: zod_1.z.number().default(0).optional(),
    query: zod_1.z.string().optional(),
});
exports.StorePutItem = zod_1.z.object({
    namespace: zod_1.z.array(zod_1.z.string()),
    key: zod_1.z.string(),
    value: zod_1.z.record(zod_1.z.unknown()),
});
exports.StoreDeleteItem = zod_1.z.object({
    namespace: zod_1.z.array(zod_1.z.string()).optional(),
    key: zod_1.z.string(),
});
exports.StoreGetItem = zod_1.z.object({
    namespace: zod_1.z
        .string()
        .optional()
        .transform((value) => { var _a; return (_a = value === null || value === void 0 ? void 0 : value.split(".")) !== null && _a !== void 0 ? _a : []; }),
    key: zod_1.z.string(),
});
exports.coercedBoolean = zod_1.z.string().transform((val) => {
    const lower = val.toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
});
