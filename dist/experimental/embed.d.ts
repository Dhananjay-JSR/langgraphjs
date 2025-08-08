import type { BaseCheckpointSaver, BaseStore, Pregel } from "@langchain/langgraph";
import { Hono } from "hono";
import type { Metadata } from "../storage/ops";
type AnyPregel = Pregel<any, any, any, any, any>;
interface Thread {
    thread_id: string;
    metadata: Metadata;
}
interface ThreadSaver {
    get: (id: string) => Promise<Thread>;
    put: (id: string, options: {
        metadata?: Metadata;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
}
/**
 * Attach LangGraph Platform-esque routes to a given Hono instance.
 * @experimental Does not follow semver.
 */
export declare function createEmbedServer(options: {
    graph: Record<string, AnyPregel>;
    threads: ThreadSaver;
    checkpointer: BaseCheckpointSaver;
    store?: BaseStore;
}): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export {};
