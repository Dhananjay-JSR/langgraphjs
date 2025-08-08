import type { AuthEventValueMap } from "@langchain/langgraph-sdk/auth";
import type { MiddlewareHandler } from "hono";
import { type AuthContext, type AuthFilters } from "./index";
declare module "hono" {
    interface ContextVariableMap {
        auth?: AuthContext | undefined;
    }
}
export declare function isAuthMatching(metadata: Record<string, unknown> | undefined, filters: AuthFilters): boolean;
export declare const handleAuthEvent: <T extends keyof AuthEventValueMap>(context: AuthContext | undefined, event: T, value: AuthEventValueMap[T]) => Promise<[AuthFilters | undefined, value: AuthEventValueMap[T]]>;
export declare const auth: () => MiddlewareHandler;
export { registerAuth } from "./index";
