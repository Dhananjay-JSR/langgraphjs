import type { CheckpointMetadata as LangGraphCheckpointMetadata, LangGraphRunnableConfig, StateSnapshot as LangGraphStateSnapshot } from "@langchain/langgraph";
import type { AuthContext } from "../auth/index";
import { type RunCommand } from "../command";
import { FileSystemPersistence } from "./persist";
export type Metadata = Record<string, unknown>;
export type ThreadStatus = "idle" | "busy" | "interrupted" | "error";
export type RunStatus = "pending" | "running" | "error" | "success" | "timeout" | "interrupted";
export type StreamMode = "values" | "messages" | "messages-tuple" | "custom" | "updates" | "events" | "debug" | "tasks" | "checkpoints";
export type MultitaskStrategy = "reject" | "rollback" | "interrupt" | "enqueue";
export type OnConflictBehavior = "raise" | "do_nothing";
export type IfNotExists = "create" | "reject";
export interface RunnableConfig {
    tags?: string[];
    recursion_limit?: number;
    configurable?: {
        thread_id?: string;
        thread_ts?: string;
        [key: string]: unknown;
    };
    metadata?: LangGraphRunnableConfig["metadata"];
}
interface Assistant {
    name: string | undefined;
    assistant_id: string;
    graph_id: string;
    created_at: Date;
    updated_at: Date;
    version: number;
    config: RunnableConfig;
    context: unknown;
    metadata: Metadata;
}
interface AssistantVersion {
    assistant_id: string;
    version: number;
    graph_id: string;
    config: RunnableConfig;
    context: unknown;
    metadata: Metadata;
    created_at: Date;
    name: string | undefined;
}
export interface RunKwargs {
    input?: unknown;
    command?: RunCommand;
    stream_mode?: Array<StreamMode>;
    interrupt_before?: "*" | string[] | undefined;
    interrupt_after?: "*" | string[] | undefined;
    config?: RunnableConfig;
    context?: unknown;
    subgraphs?: boolean;
    resumable?: boolean;
    temporary?: boolean;
    webhook?: unknown;
    feedback_keys?: string[] | undefined;
    [key: string]: unknown;
}
export interface Run {
    run_id: string;
    thread_id: string;
    assistant_id: string;
    created_at: Date;
    updated_at: Date;
    status: RunStatus;
    metadata: Metadata;
    kwargs: RunKwargs;
    multitask_strategy: MultitaskStrategy;
}
interface Store {
    runs: Record<string, Run>;
    threads: Record<string, Thread>;
    assistants: Record<string, Assistant>;
    assistant_versions: AssistantVersion[];
    retry_counter: Record<string, number>;
}
export declare const conn: FileSystemPersistence<Store>;
interface Message {
    topic: `run:${string}:stream:${string}`;
    data: unknown;
}
declare class Queue {
    private log;
    private listeners;
    private nextId;
    private resumable;
    constructor(options: {
        resumable: boolean;
    });
    push(item: Message): void;
    get(options: {
        timeout: number;
        lastEventId?: string;
        signal?: AbortSignal;
    }): Promise<[id: string, message: Message]>;
}
declare class CancellationAbortController extends AbortController {
    abort(reason: "rollback" | "interrupt"): void;
}
declare class StreamManagerImpl {
    readers: Record<string, Queue>;
    control: Record<string, CancellationAbortController>;
    getQueue(runId: string, options: {
        ifNotFound: "create";
        resumable: boolean;
    }): Queue;
    getControl(runId: string): CancellationAbortController | undefined;
    isLocked(runId: string): boolean;
    lock(runId: string): AbortSignal;
    unlock(runId: string): void;
}
export declare const StreamManager: StreamManagerImpl;
export declare const truncate: (flags: {
    runs?: boolean;
    threads?: boolean;
    assistants?: boolean;
    checkpointer?: boolean;
    store?: boolean;
}) => Promise<void>;
export declare class Assistants {
    static search(options: {
        graph_id?: string;
        metadata?: Metadata;
        limit: number;
        offset: number;
    }, auth: AuthContext | undefined): AsyncGenerator<{
        assistant: Assistant;
        total: number;
    }>;
    static get(assistant_id: string, auth: AuthContext | undefined): Promise<Assistant>;
    static put(assistant_id: string, options: {
        config: RunnableConfig;
        context: unknown;
        graph_id: string;
        metadata?: Metadata;
        if_exists: OnConflictBehavior;
        name?: string;
    }, auth: AuthContext | undefined): Promise<Assistant>;
    static patch(assistantId: string, options: {
        config?: RunnableConfig;
        context?: unknown;
        graph_id?: string;
        metadata?: Metadata;
        name?: string;
    }, auth: AuthContext | undefined): Promise<Assistant>;
    static delete(assistant_id: string, auth: AuthContext | undefined): Promise<string[]>;
    static setLatest(assistant_id: string, version: number, auth: AuthContext | undefined): Promise<Assistant>;
    static getVersions(assistant_id: string, options: {
        limit: number;
        offset: number;
        metadata?: Metadata;
    }, auth: AuthContext | undefined): Promise<AssistantVersion[]>;
}
interface Thread {
    thread_id: string;
    created_at: Date;
    updated_at: Date;
    metadata?: Metadata;
    config?: RunnableConfig;
    status: ThreadStatus;
    values?: Record<string, unknown>;
    interrupts?: Record<string, unknown>;
}
interface CheckpointTask {
    id: string;
    name: string;
    error?: string;
    interrupts: Record<string, unknown>;
    state?: RunnableConfig;
}
interface CheckpointPayload {
    config?: RunnableConfig;
    metadata: LangGraphCheckpointMetadata;
    values: Record<string, unknown>;
    next: string[];
    parent_config?: RunnableConfig;
    tasks: CheckpointTask[];
}
export interface Checkpoint {
    thread_id: string;
    checkpoint_ns: string;
    checkpoint_id: string | null;
    checkpoint_map: Record<string, unknown> | null;
}
interface ThreadTask {
    id: string;
    name: string;
    error: string | null;
    interrupts: Record<string, unknown>[];
    checkpoint: Checkpoint | null;
    state: ThreadState | null;
    result: unknown | null;
}
export interface ThreadState {
    values: Record<string, unknown>;
    next: string[];
    checkpoint: Checkpoint | null;
    metadata: Record<string, unknown> | undefined;
    created_at: Date | null;
    parent_checkpoint: Checkpoint | null;
    tasks: ThreadTask[];
}
export declare class Threads {
    static search(options: {
        metadata?: Metadata;
        status?: ThreadStatus;
        values?: Record<string, unknown>;
        limit: number;
        offset: number;
        sort_by?: "thread_id" | "status" | "created_at" | "updated_at";
        sort_order?: "asc" | "desc";
    }, auth: AuthContext | undefined): AsyncGenerator<{
        thread: Thread;
        total: number;
    }>;
    static get(thread_id: string, auth: AuthContext | undefined): Promise<Thread>;
    static put(thread_id: string, options: {
        metadata?: Metadata;
        if_exists: OnConflictBehavior;
    }, auth: AuthContext | undefined): Promise<Thread>;
    static patch(threadId: string, options: {
        metadata?: Metadata;
    }, auth: AuthContext | undefined): Promise<Thread>;
    static setStatus(threadId: string, options: {
        checkpoint?: CheckpointPayload;
        exception?: Error;
    }): Promise<void>;
    static delete(thread_id: string, auth: AuthContext | undefined): Promise<string[]>;
    static copy(thread_id: string, auth: AuthContext | undefined): Promise<Thread>;
    static State: {
        new (): {};
        get(config: RunnableConfig, options: {
            subgraphs?: boolean;
        }, auth: AuthContext | undefined): Promise<LangGraphStateSnapshot>;
        post(config: RunnableConfig, values: Record<string, unknown>[] | Record<string, unknown> | null | undefined, asNode: string | undefined, auth: AuthContext | undefined): Promise<{
            checkpoint: Record<string, any> | undefined;
        }>;
        bulk(config: RunnableConfig, supersteps: Array<{
            updates: Array<{
                values?: Record<string, unknown>[] | Record<string, unknown> | unknown | null | undefined;
                command?: RunCommand | undefined | null;
                as_node?: string | undefined;
            }>;
        }>, auth: AuthContext | undefined): Promise<never[] | {
            checkpoint: Record<string, any> | undefined;
        }>;
        list(config: RunnableConfig, options: {
            limit?: number;
            before?: string | RunnableConfig;
            metadata?: Metadata;
        }, auth: AuthContext | undefined): Promise<LangGraphStateSnapshot[]>;
    };
}
export declare class Runs {
    static next(): AsyncGenerator<{
        run: Run;
        attempt: number;
        signal: AbortSignal;
    }>;
    static put(runId: string, assistantId: string, kwargs: RunKwargs, options: {
        threadId?: string;
        userId?: string;
        status?: RunStatus;
        metadata?: Metadata;
        preventInsertInInflight?: boolean;
        multitaskStrategy?: MultitaskStrategy;
        ifNotExists?: IfNotExists;
        afterSeconds?: number;
    }, auth: AuthContext | undefined): Promise<Run[]>;
    static get(runId: string, thread_id: string | undefined, auth: AuthContext | undefined): Promise<Run | null>;
    static delete(run_id: string, thread_id: string | undefined, auth: AuthContext | undefined): Promise<string | null>;
    static wait(runId: string, threadId: string | undefined, auth: AuthContext | undefined): Promise<unknown>;
    static join(runId: string, threadId: string, auth: AuthContext | undefined): Promise<{} | null>;
    static cancel(threadId: string | undefined, runIds: string[], options: {
        action?: "interrupt" | "rollback";
    }, auth: AuthContext | undefined): Promise<void>;
    static search(threadId: string, options: {
        limit?: number | null;
        offset?: number | null;
        status?: string | null;
        metadata?: Metadata | null;
    }, auth: AuthContext | undefined): Promise<Run[]>;
    static setStatus(runId: string, status: RunStatus): Promise<void>;
    static Stream: {
        new (): {};
        join(runId: string, threadId: string | undefined, options: {
            ignore404?: boolean;
            cancelOnDisconnect?: AbortSignal;
            lastEventId: string | undefined;
        }, auth: AuthContext | undefined): AsyncGenerator<{
            id?: string;
            event: string;
            data: unknown;
        }>;
        publish(payload: {
            runId: string;
            event: string;
            data: unknown;
            resumable: boolean;
        }): Promise<void>;
    };
}
export declare class Crons {
}
export {};
