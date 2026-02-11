"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var _RouterFramework_rootPath, _RouterFramework_filterNode, _RouterFramework_processNode, _RouterFramework_onDir, _RouterFramework_loading, _RouterFramework_loaded;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterFramework = exports.DenoProxy = exports.isDeno = void 0;
exports.walk = walk;
const router_1 = __importStar(require("./router"));
exports.isDeno = "Deno" in globalThis;
exports.DenoProxy = exports.isDeno ? globalThis.Deno : {};
const defaultValidExtensions = [".ts", ".js", ".tsx", ".jsx"];
const defaultNodeFilter = (node) => defaultValidExtensions.some((ext) => node.name.endsWith(ext));
const defaultNodeProcessor = (node) => {
    const extensionIndex = node.name.lastIndexOf(".");
    if (extensionIndex !== -1)
        node.name = node.name.slice(0, extensionIndex);
};
class RouterFramework extends router_1.default {
    get loading() {
        return __classPrivateFieldGet(this, _RouterFramework_loading, "f");
    }
    get loaded() {
        return __classPrivateFieldGet(this, _RouterFramework_loaded, "f");
    }
    constructor(config) {
        const _a = config !== null && config !== void 0 ? config : {}, { rootPath, filterNode, processNode, onDir } = _a, baseConfig = __rest(_a, ["rootPath", "filterNode", "processNode", "onDir"]);
        super(baseConfig);
        _RouterFramework_rootPath.set(this, void 0);
        _RouterFramework_filterNode.set(this, void 0);
        _RouterFramework_processNode.set(this, void 0);
        _RouterFramework_onDir.set(this, void 0);
        _RouterFramework_loading.set(this, false);
        _RouterFramework_loaded.set(this, false);
        __classPrivateFieldSet(this, _RouterFramework_rootPath, rootPath || "./routes", "f");
        __classPrivateFieldSet(this, _RouterFramework_filterNode, filterNode !== null && filterNode !== void 0 ? filterNode : defaultNodeFilter, "f");
        __classPrivateFieldSet(this, _RouterFramework_processNode, processNode !== null && processNode !== void 0 ? processNode : defaultNodeProcessor, "f");
        __classPrivateFieldSet(this, _RouterFramework_onDir, onDir, "f");
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            if (__classPrivateFieldGet(this, _RouterFramework_loading, "f") || __classPrivateFieldGet(this, _RouterFramework_loaded, "f")) {
                throw new Error("RouterFramework already loading or loaded");
            }
            __classPrivateFieldSet(this, _RouterFramework_loading, true, "f");
            try {
                for (var _d = true, _e = __asyncValues(walk(__classPrivateFieldGet(this, _RouterFramework_rootPath, "f"))), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    let node = _c;
                    if (node.type !== "dir") {
                        let handlersImp;
                        let handlers;
                        try {
                            handlersImp = yield import(exports.isDeno ? `file://${node.fullPath}` : node.fullPath);
                            handlers = handlersImp === null || handlersImp === void 0 ? void 0 : handlersImp.default;
                        }
                        catch (error) {
                            console.error(`Failed to import route at ${node.fullPath}:`, error);
                        }
                        // filter the node
                        if (!handlers || !(__classPrivateFieldGet(this, _RouterFramework_filterNode, "f") && __classPrivateFieldGet(this, _RouterFramework_filterNode, "f").call(this, node))) {
                            continue;
                        }
                        // process the node
                        if (__classPrivateFieldGet(this, _RouterFramework_processNode, "f"))
                            __classPrivateFieldGet(this, _RouterFramework_processNode, "f").call(this, node);
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
                            for (const [uchandlerType, pipeline] of Object.entries(methodHandlers)) {
                                const handlerType = uchandlerType.toLowerCase();
                                if ((0, router_1.isValidHttpMethod)(method) ||
                                    method === "ALL" ||
                                    method === "CRUD") {
                                    this.setRoutes(handlerType, `${method} ${path}`, pipeline);
                                }
                                else {
                                    throw new Error(`Invalid http method '${method}'`);
                                }
                            }
                        }
                    }
                    else if (__classPrivateFieldGet(this, _RouterFramework_onDir, "f")) {
                        __classPrivateFieldGet(this, _RouterFramework_onDir, "f").call(this, node);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            __classPrivateFieldSet(this, _RouterFramework_loading, false, "f");
            __classPrivateFieldSet(this, _RouterFramework_loaded, true, "f");
            return this;
        });
    }
}
exports.RouterFramework = RouterFramework;
_RouterFramework_rootPath = new WeakMap(), _RouterFramework_filterNode = new WeakMap(), _RouterFramework_processNode = new WeakMap(), _RouterFramework_onDir = new WeakMap(), _RouterFramework_loading = new WeakMap(), _RouterFramework_loaded = new WeakMap();
function walk(dir, rootPath) {
    return __asyncGenerator(this, arguments, function* walk_1() {
        var _a, e_2, _b, _c;
        rootPath = rootPath || dir;
        if (exports.isDeno) {
            const { join, resolve, relative } = yield __await(import("https://deno.land/std/path/mod.ts"));
            try {
                for (var _d = true, _e = __asyncValues(exports.DenoProxy.readDir(dir)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const entry = _c;
                    const name = entry.name;
                    const parent = relative(rootPath, dir).replace(/\\/g, "/");
                    const path = join(dir, name).replace(/\\/g, "/");
                    const fullPath = resolve(dir, name).replace(/\\/g, "/");
                    const relativePath = relative(rootPath, path).replace(/\\/g, "/");
                    if (entry.isDirectory) {
                        yield yield __await({ type: "dir", name, path, parent, fullPath, relativePath });
                        yield __await(yield* __asyncDelegator(__asyncValues(walk(path, rootPath))));
                    }
                    else {
                        yield yield __await({ type: "file", name, path, parent, fullPath, relativePath });
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        else {
            const fs = yield __await(import("fs"));
            const { join, resolve, relative } = yield __await(import("path"));
            for (const entry of yield __await(fs.promises.readdir(dir, {
                withFileTypes: true,
            }))) {
                const name = entry.name;
                const parent = relative(rootPath, dir).replace(/\\/g, "/");
                const path = join(dir, name).replace(/\\/g, "/");
                const fullPath = resolve(dir, name).replace(/\\/g, "/");
                const relativePath = relative(rootPath, path).replace(/\\/g, "/");
                if (entry.isDirectory()) {
                    yield yield __await({ type: "dir", name, path, parent, fullPath, relativePath });
                    yield __await(yield* __asyncDelegator(__asyncValues(walk(path, rootPath))));
                }
                else {
                    yield yield __await({ type: "file", name, path, parent, fullPath, relativePath });
                }
            }
        }
    });
}
//# sourceMappingURL=framework.js.map