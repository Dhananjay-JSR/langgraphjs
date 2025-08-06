import { z } from "zod";
import { CompiledGraph, LangGraphRunnableConfig } from "@langchain/langgraph";
import { CompiledGraphFactory } from "./graph/load.utils";
export declare const StartServerSchema: z.ZodObject<{
    port: z.ZodNumber;
    nWorkers: z.ZodNumber;
    host: z.ZodString;
    cwd: z.ZodString;
    graphs: z.ZodRecord<z.ZodString, z.ZodString>;
    auth: z.ZodOptional<z.ZodObject<{
        path: z.ZodOptional<z.ZodString>;
        disable_studio_auth: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        disable_studio_auth: boolean;
        path?: string | undefined;
    }, {
        path?: string | undefined;
        disable_studio_auth?: boolean | undefined;
    }>>;
    ui: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    ui_config: z.ZodOptional<z.ZodObject<{
        shared: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        shared?: string[] | undefined;
    }, {
        shared?: string[] | undefined;
    }>>;
    http: z.ZodOptional<z.ZodObject<{
        app: z.ZodOptional<z.ZodString>;
        disable_assistants: z.ZodDefault<z.ZodBoolean>;
        disable_threads: z.ZodDefault<z.ZodBoolean>;
        disable_runs: z.ZodDefault<z.ZodBoolean>;
        disable_store: z.ZodDefault<z.ZodBoolean>;
        disable_meta: z.ZodDefault<z.ZodBoolean>;
        cors: z.ZodOptional<z.ZodObject<{
            allow_origins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            allow_methods: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            allow_headers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            allow_credentials: z.ZodOptional<z.ZodBoolean>;
            allow_origin_regex: z.ZodOptional<z.ZodString>;
            expose_headers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            max_age: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        }, {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        disable_assistants: boolean;
        disable_threads: boolean;
        disable_runs: boolean;
        disable_store: boolean;
        disable_meta: boolean;
        cors?: {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        } | undefined;
        app?: string | undefined;
    }, {
        cors?: {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        } | undefined;
        app?: string | undefined;
        disable_assistants?: boolean | undefined;
        disable_threads?: boolean | undefined;
        disable_runs?: boolean | undefined;
        disable_store?: boolean | undefined;
        disable_meta?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    cwd: string;
    host: string;
    port: number;
    nWorkers: number;
    graphs: Record<string, string>;
    auth?: {
        disable_studio_auth: boolean;
        path?: string | undefined;
    } | undefined;
    ui?: Record<string, string> | undefined;
    ui_config?: {
        shared?: string[] | undefined;
    } | undefined;
    http?: {
        disable_assistants: boolean;
        disable_threads: boolean;
        disable_runs: boolean;
        disable_store: boolean;
        disable_meta: boolean;
        cors?: {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        } | undefined;
        app?: string | undefined;
    } | undefined;
}, {
    cwd: string;
    host: string;
    port: number;
    nWorkers: number;
    graphs: Record<string, string>;
    auth?: {
        path?: string | undefined;
        disable_studio_auth?: boolean | undefined;
    } | undefined;
    ui?: Record<string, string> | undefined;
    ui_config?: {
        shared?: string[] | undefined;
    } | undefined;
    http?: {
        cors?: {
            allow_origin_regex?: string | undefined;
            expose_headers?: string[] | undefined;
            allow_origins?: string[] | undefined;
            allow_methods?: string[] | undefined;
            allow_headers?: string[] | undefined;
            allow_credentials?: boolean | undefined;
            max_age?: number | undefined;
        } | undefined;
        app?: string | undefined;
        disable_assistants?: boolean | undefined;
        disable_threads?: boolean | undefined;
        disable_runs?: boolean | undefined;
        disable_store?: boolean | undefined;
        disable_meta?: boolean | undefined;
    } | undefined;
}>;
export declare function startServerWithNew({ registerGraphs, config, serverConfig }: {
    registerGraphs: {
        sourceFile: string;
        graph: CompiledGraph<string> | CompiledGraphFactory<string>;
        exportSymbol: string;
    };
    serverConfig: {
        port: number;
        host: string;
        workers: number;
    };
    config: LangGraphRunnableConfig;
}): Promise<{
    host: string;
    cleanup: () => Promise<void>;
}>;
export declare function startServer(options: z.infer<typeof StartServerSchema>): Promise<{
    host: string;
    cleanup: () => Promise<void>;
}>;
