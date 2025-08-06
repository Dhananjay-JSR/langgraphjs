import type { JSONSchema7 } from "json-schema";
import type { Pregel } from "@langchain/langgraph";
export interface GraphSchema {
    state: JSONSchema7 | undefined;
    input: JSONSchema7 | undefined;
    output: JSONSchema7 | undefined;
    config: JSONSchema7 | undefined;
}
export interface GraphSpec {
    sourceFile: string;
    exportSymbol: string;
}
type GraphSchemaWithSubgraphs = Record<string, GraphSchema>;
export declare function getStaticGraphSchema(spec: GraphSpec, options?: {
    mainThread?: boolean;
    timeoutMs?: number;
}): Promise<GraphSchemaWithSubgraphs>;
export declare function getStaticGraphSchema(specMap: Record<string, GraphSpec>, options?: {
    mainThread?: boolean;
    timeoutMs?: number;
}): Promise<Record<string, GraphSchemaWithSubgraphs>>;
export declare function getRuntimeGraphSchema(graph: Pregel<any, any, any, any, any>): Promise<GraphSchema | undefined>;
export {};
