import Router, { RouterConfig, RouterContext } from "./router";
import type { Handler, HttpMethod, Pipeline, CTXError } from "./types";
export type UCHandlerType = "FILTER" | "HOOK" | "HANDLER" | "FALLBACK" | "CATCHER" | "AFTER";
export type RouterHandlers<CommonXContext = {}, MethodContexts extends Partial<Record<HttpMethod | "ALL" | "CRUD", Record<string, any>>> = {}> = {
    [K in HttpMethod | "ALL" | "CRUD" as K]?: {
        [H in UCHandlerType as H]?: H extends "CATCHER" ? Handler<CommonXContext & CTXError & MethodContexts[K]> | Pipeline<CommonXContext & CTXError & MethodContexts[K]> : Handler<CommonXContext & MethodContexts[K]> | Pipeline<CommonXContext & MethodContexts[K]>;
    };
};
export interface RouterFrameworkConfig<Context extends RouterContext = RouterContext> extends RouterConfig<Context> {
    rootPath?: string;
    filterNode?: (node: DirWalkNode) => boolean;
    processNode?: (node: DirWalkNode) => void;
    onDir?: (node: DirWalkNode) => void;
}
export declare class RouterFramework<EXTContext = {}, Context extends RouterContext<EXTContext> = RouterContext<EXTContext>> extends Router<Context> {
    #private;
    get loading(): boolean;
    get loaded(): boolean;
    constructor(config?: RouterFrameworkConfig<Context>);
    load(): Promise<RouterFramework<Context>>;
}
export interface DirWalkNode {
    type: string;
    name: string;
    path: string;
    parent: string;
    fullPath: string;
    relativePath: string;
}
export declare function walk(dir: string, rootPath?: string): AsyncGenerator<DirWalkNode>;
//# sourceMappingURL=framework.deno.d.ts.map