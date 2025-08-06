import type { BaseCheckpointSaver, BaseStore, CompiledGraph, LangGraphRunnableConfig } from "@langchain/langgraph";
import { type CompiledGraphFactory } from "./load.utils";
import type { GraphSchema, GraphSpec } from "./parser/index";
export declare const GRAPHS: Record<string, CompiledGraph<string> | CompiledGraphFactory<string>>;
export declare const GRAPH_SPEC: Record<string, GraphSpec>;
export declare const GRAPH_SCHEMA: Record<string, Record<string, GraphSchema>>;
export declare const NAMESPACE_GRAPH: Uint8Array<ArrayBufferLike>;
export declare const getAssistantId: (graphId: string) => string;
export declare function registerGraphFromReference({ registerGraphs, config }: {
    registerGraphs: {
        sourceFile: string;
        graph: CompiledGraph<string> | CompiledGraphFactory<string>;
        exportSymbol: string;
    };
    config: LangGraphRunnableConfig;
}): Promise<void>;
export declare function registerFromEnv(specs: Record<string, string>, options: {
    cwd: string;
}): Promise<(CompiledGraph<string, any, any, Record<string, any>, any, any> | CompiledGraphFactory<string>)[]>;
export declare function getGraph(graphId: string, config: LangGraphRunnableConfig | undefined, options?: {
    checkpointer?: BaseCheckpointSaver | null;
    store?: BaseStore;
}): Promise<import("@langchain/langgraph").CompiledStateGraph<any, any, any, any, any, any>>;
export declare function getCachedStaticGraphSchema(graphId: string): Promise<Record<string, GraphSchema>>;
