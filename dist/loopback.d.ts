import { Hono } from "hono";
export declare function getLoopbackFetch(): (url: string, init?: RequestInit) => Promise<Response>;
export declare const bindLoopbackFetch: (app: Hono) => void;
