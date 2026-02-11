import Router, {
  isValidHttpMethod,
  RouterConfig,
  RouterContext,
} from "./router";
import type {
  Handler,
  HandlerType,
  HttpMethod,
  MethodPath,
  Pipeline,
  CTXError,
} from "./types";

export const isDeno = "Deno" in globalThis;
export const DenoProxy = isDeno ? (globalThis as any).Deno : {};
const defaultValidExtensions = [".ts", ".js", ".tsx", ".jsx"];
const defaultNodeFilter = (node: DirWalkNode) =>
  defaultValidExtensions.some((ext) => node.name.endsWith(ext));
const defaultNodeProcessor = (node: DirWalkNode) => {
  const extensionIndex = node.name.lastIndexOf(".");
  if (extensionIndex !== -1) node.name = node.name.slice(0, extensionIndex);
};

export type UCHandlerType =
  | "FILTER"
  | "HOOK"
  | "HANDLER"
  | "FALLBACK"
  | "CATCHER"
  | "AFTER";

export type RouterHandlers<
  CommonXContext = {},
  MethodContexts extends Partial<
    Record<HttpMethod | "ALL" | "CRUD", Record<string, any>>
  > = {},
> = {
  [K in HttpMethod | "ALL" | "CRUD" as K]?: {
    [H in UCHandlerType as H]?: H extends "CATCHER"
      ?
          | Handler<CommonXContext & CTXError & MethodContexts[K]>
          | Pipeline<CommonXContext & CTXError & MethodContexts[K]>
      :
          | Handler<CommonXContext & MethodContexts[K]>
          | Pipeline<CommonXContext & MethodContexts[K]>;
  };
};

export interface RouterFrameworkConfig<
  Context extends RouterContext = RouterContext,
> extends RouterConfig<Context> {
  rootPath?: string;
  filterNode?: (node: DirWalkNode) => boolean;
  processNode?: (node: DirWalkNode) => void;
  onDir?: (node: DirWalkNode) => void;
}

export class RouterFramework<
  EXTContext = {},
  Context extends RouterContext<EXTContext> = RouterContext<EXTContext>,
> extends Router<Context> {
  #rootPath: string;
  #filterNode?: (node: DirWalkNode) => boolean;
  #processNode?: (node: DirWalkNode) => void;
  #onDir?: (node: DirWalkNode) => void;
  #loading: boolean = false;
  #loaded: boolean = false;

  get loading(): boolean {
    return this.#loading;
  }

  get loaded(): boolean {
    return this.#loaded;
  }

  constructor(config?: RouterFrameworkConfig<Context>) {
    const { rootPath, filterNode, processNode, onDir, ...baseConfig } =
      config ?? {};
    super(baseConfig);
    this.#rootPath = rootPath || "./routes";
    this.#filterNode = filterNode ?? defaultNodeFilter;
    this.#processNode = processNode ?? defaultNodeProcessor;
    this.#onDir = onDir;
  }

  async load(): Promise<RouterFramework<Context>> {
    if (this.#loading || this.#loaded) {
      throw new Error("RouterFramework already loading or loaded");
    }
    this.#loading = true;
    for await (let node of walk(this.#rootPath)) {
      if (node.type !== "dir") {
        let handlersImp;
        let handlers: RouterHandlers | undefined;
        try {
          handlersImp = await import(
            isDeno ? `file://${node.fullPath}` : node.fullPath
          );
          handlers = handlersImp?.default satisfies RouterHandlers;
        } catch (error) {
          console.error(`Failed to import route at ${node.fullPath}:`, error);
        }
        // filter the node
        if (!handlers || !(this.#filterNode && this.#filterNode(node))) {
          continue;
        }
        // process the node
        if (this.#processNode) this.#processNode(node);
        const name = node.name;
        let path;
        switch (name) {
          case "[$$]":
            path = `${node.parent ? "/" + node.parent + "/" : "/"}.**`;
            break;
          case "($$)":
            path = `${node.parent ? "/" + node.parent + "/" : "/"}**`;
            break;
          case "[$]":
            path = `${node.parent ? "/" + node.parent + "/" : "/"}.*`;
            break;
          case "($)":
            path = `${node.parent ? "/" + node.parent + "/" : "/"}*`;
            break;
          case "index":
            path = "/" + node.parent;
            break;
          default:
            path = `${node.parent ? "/" + node.parent + "/" : "/"}${name}`;
            break;
        }
        // replace (param) with :param
        path = path.replace(/\[([^\/]+?)\]/g, ":$1");
        // set handlers
        for (const [method, methodHandlers] of Object.entries(handlers)) {
          for (const [uchandlerType, pipeline] of Object.entries(
            methodHandlers,
          )) {
            const handlerType = uchandlerType.toLowerCase() as HandlerType;
            if (
              isValidHttpMethod(method) ||
              method === "ALL" ||
              method === "CRUD"
            ) {
              this.setRoutes(
                handlerType,
                `${method} ${path}` as MethodPath,
                pipeline as unknown as
                  | Handler<Context>
                  | Pipeline<Context>
                  | Handler<Context & CTXError>
                  | Pipeline<Context & CTXError>,
              );
            } else {
              throw new Error(`Invalid http method '${method}'`);
            }
          }
        }
      } else if (this.#onDir) {
        this.#onDir(node);
      }
    }
    this.#loading = false;
    this.#loaded = true;
    return this;
  }
}

export interface DirWalkNode {
  type: string;
  name: string;
  path: string;
  parent: string;
  fullPath: string;
  relativePath: string;
}

export async function* walk(
  dir: string,
  rootPath?: string,
): AsyncGenerator<DirWalkNode> {
  rootPath = rootPath || dir;
  if (isDeno) {
    const { join, resolve, relative } = await import("jsr:@std/path@1");
    for await (const entry of DenoProxy.readDir(dir)) {
      const name = entry.name;
      const parent = relative(rootPath, dir).replace(/\\/g, "/");
      const path = join(dir, name).replace(/\\/g, "/");
      const fullPath = resolve(dir, name).replace(/\\/g, "/");
      const relativePath = relative(rootPath, path).replace(/\\/g, "/");
      if (entry.isDirectory) {
        yield { type: "dir", name, path, parent, fullPath, relativePath };
        yield* walk(path, rootPath);
      } else {
        yield { type: "file", name, path, parent, fullPath, relativePath };
      }
    }
  } else {
    const fs = await import("fs");
    const { join, resolve, relative } = await import("path");
    for (const entry of await fs.promises.readdir(dir, {
      withFileTypes: true,
    })) {
      const name = entry.name;
      const parent = relative(rootPath, dir).replace(/\\/g, "/");
      const path = join(dir, name).replace(/\\/g, "/");
      const fullPath = resolve(dir, name).replace(/\\/g, "/");
      const relativePath = relative(rootPath, path).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        yield { type: "dir", name, path, parent, fullPath, relativePath };
        yield* walk(path, rootPath);
      } else {
        yield { type: "file", name, path, parent, fullPath, relativePath };
      }
    }
  }
}
