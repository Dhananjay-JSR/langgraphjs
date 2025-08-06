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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubgraphExtractor = void 0;
const ts = __importStar(require("typescript"));
const vfs = __importStar(require("@typescript/vfs"));
const path = __importStar(require("node:path"));
const dedent_1 = __importDefault(require("dedent"));
const types_1 = require("./schema/types");
const OVERRIDE_RESOLVE = [
    // Override `@langchain/langgraph` or `@langchain/langgraph/prebuilt`,
    // but not `@langchain/langgraph-sdk`
    new RegExp(`^@langchain\/langgraph(\/.+)?$`),
    new RegExp(`^@langchain\/langgraph-checkpoint(\/.+)?$`),
];
const INFER_TEMPLATE_PATH = path.resolve(__dirname, "./schema/types.template.ts");
class SubgraphExtractor {
    constructor(program, sourceFile, inferFile, options) {
        var _a;
        this.findTypeByName = (needle) => {
            let result = undefined;
            const visit = (node) => {
                if (ts.isTypeAliasDeclaration(node)) {
                    const symbol = node.symbol;
                    if (symbol != null) {
                        const name = this.checker
                            .getFullyQualifiedName(symbol)
                            .replace(/".*"\./, "");
                        if (name === needle)
                            result = this.checker.getTypeAtLocation(node);
                    }
                }
                if (result == null)
                    ts.forEachChild(node, visit);
            };
            ts.forEachChild(this.inferFile, visit);
            if (!result)
                throw new Error(`Failed to find "${needle}" type`);
            return result;
        };
        this.find = (root, predicate) => {
            let result = undefined;
            const visit = (node) => {
                if (predicate(node)) {
                    result = node;
                }
                else {
                    ts.forEachChild(node, visit);
                }
            };
            if (predicate(root))
                return root;
            ts.forEachChild(root, visit);
            return result;
        };
        this.findSubgraphs = (node, namespace = []) => {
            const findAllAddNodeCalls = (acc, node) => {
                if (ts.isCallExpression(node)) {
                    const firstChild = node.getChildAt(0);
                    if (ts.isPropertyAccessExpression(firstChild) &&
                        this.getText(firstChild.name) === "addNode") {
                        let nodeName = "unknown";
                        let variables = [];
                        const [subgraphNode, callArg] = node.arguments;
                        if (subgraphNode && ts.isStringLiteralLike(subgraphNode)) {
                            nodeName = this.getText(subgraphNode);
                            if ((nodeName.startsWith(`"`) && nodeName.endsWith(`"`)) ||
                                (nodeName.startsWith(`'`) && nodeName.endsWith(`'`))) {
                                nodeName = nodeName.slice(1, -1);
                            }
                        }
                        if (callArg) {
                            if (ts.isFunctionLike(callArg) ||
                                ts.isCallLikeExpression(callArg)) {
                                variables = this.reduceChildren(callArg, this.findSubgraphIdentifiers, []);
                            }
                            else if (ts.isIdentifier(callArg)) {
                                variables = this.findSubgraphIdentifiers([], callArg);
                            }
                        }
                        if (variables.length > 0) {
                            if (variables.length > 1) {
                                const targetName = [...namespace, nodeName].join("|");
                                const errMsg = `Multiple unique subgraph invocations found for "${targetName}"`;
                                if (this.strict)
                                    throw new Error(errMsg);
                                console.warn(errMsg);
                            }
                            acc.push({
                                namespace: namespace,
                                node: nodeName,
                                subgraph: variables[0],
                            });
                        }
                    }
                }
                return acc;
            };
            let subgraphs = this.reduceChildren(node, findAllAddNodeCalls, []);
            // TODO: make this more strict, only traverse the flow graph only
            // if no `addNode` calls were found
            if (!subgraphs.length) {
                const candidate = this.find(node, (node) => node && "flowNode" in node && node.flowNode);
                if ((candidate === null || candidate === void 0 ? void 0 : candidate.flowNode) &&
                    this.isGraphOrPregelType(this.checker.getTypeAtLocation(candidate.flowNode.node))) {
                    subgraphs = this.findSubgraphs(candidate.flowNode.node, namespace);
                }
            }
            // handle recursive behaviour
            if (subgraphs.length > 0) {
                return [
                    ...subgraphs,
                    ...subgraphs.map(({ subgraph, node }) => this.findSubgraphs(subgraph.node, [...namespace, node])),
                ].flat();
            }
            return subgraphs;
        };
        this.getSubgraphsVariables = (name) => {
            var _a;
            const sourceSymbol = this.checker.getSymbolAtLocation(this.sourceFile);
            const exports = this.checker.getExportsOfModule(sourceSymbol);
            const targetExport = exports.find((item) => item.name === name);
            if (!targetExport)
                throw new Error(`Failed to find export "${name}"`);
            const varDecls = ((_a = targetExport.declarations) !== null && _a !== void 0 ? _a : []).filter(ts.isVariableDeclaration);
            return varDecls.flatMap((varDecl) => {
                if (!varDecl.initializer)
                    return [];
                return this.findSubgraphs(varDecl.initializer, [name]);
            });
        };
        this.getAugmentedSourceFile = (sourcePath, name, options) => {
            function sanitize(input) {
                return input.replace(/[^a-zA-Z0-9]/g, "_");
            }
            const vars = this.getSubgraphsVariables(name);
            const ext = path.extname(sourcePath);
            const suffix = sourcePath.slice(0, -ext.length);
            let typeExports = [
                {
                    typeName: sanitize(`__langgraph__${name}_${suffix}`),
                    valueName: name,
                    graphName: name,
                },
            ];
            const seenTypeName = new Set();
            for (const { subgraph, node, namespace } of vars) {
                if (seenTypeName.has(subgraph.name))
                    continue;
                seenTypeName.add(subgraph.name);
                typeExports.push({
                    typeName: sanitize(`__langgraph__${namespace.join("_")}_${node}_${suffix}`),
                    valueName: subgraph.name,
                    graphName: [...namespace, node].join("|"),
                });
            }
            typeExports = typeExports.map((_a) => {
                var { typeName } = _a, rest = __rest(_a, ["typeName"]);
                return (Object.assign(Object.assign({}, rest), { typeName: sanitize(typeName) }));
            });
            const sourceFilePath = `__langgraph__source_${sanitize(suffix)}${ext}`;
            const sourceContents = [
                this.getText(this.sourceFile),
                typeExports.map((type) => `export type ${type.typeName} = typeof ${type.valueName}`),
            ];
            const inferFilePath = `__langgraph__infer_${sanitize(suffix)}${ext}`;
            const sourceFileImportPath = options.allowImportingTsExtensions
                ? sourceFilePath
                : sourceFilePath.slice(0, -ext.length) + ext.replace("ts", "js");
            const inferContents = [
                typeExports.map((type) => `import type { ${type.typeName} } from "./${sourceFileImportPath}"`),
                this.inferFile.getText(this.inferFile),
                typeExports.map((type) => (0, dedent_1.default) `
          type ${type.typeName}__reflect = Reflect<${type.typeName}>;
          export type ${type.typeName}__state = Inspect<${type.typeName}__reflect["state"]>;
          export type ${type.typeName}__update = Inspect<${type.typeName}__reflect["update"]>;

          type ${type.typeName}__builder = BuilderReflect<${type.typeName}>;
          export type ${type.typeName}__input = Inspect<FilterAny<${type.typeName}__builder["input"]>>;
          export type ${type.typeName}__output = Inspect<FilterAny<${type.typeName}__builder["output"]>>;
          export type ${type.typeName}__config = Inspect<FilterAny<${type.typeName}__builder["config"]>>;
        `),
            ];
            return {
                inferFile: {
                    fileName: inferFilePath,
                    contents: inferContents.flat(1).join("\n\n"),
                },
                sourceFile: {
                    fileName: sourceFilePath,
                    contents: sourceContents.flat(1).join("\n\n"),
                },
                exports: typeExports,
            };
        };
        this.findSubgraphIdentifiers = (acc, node) => {
            if (ts.isIdentifier(node)) {
                const smb = this.checker.getSymbolAtLocation(node);
                if ((smb === null || smb === void 0 ? void 0 : smb.valueDeclaration) &&
                    ts.isVariableDeclaration(smb.valueDeclaration)) {
                    const target = smb.valueDeclaration;
                    const targetType = this.checker.getTypeAtLocation(target);
                    if (this.isGraphOrPregelType(targetType)) {
                        acc.push({ name: this.getText(target.name), node: target });
                    }
                }
                if (smb === null || smb === void 0 ? void 0 : smb.declarations) {
                    const target = smb.declarations.find(ts.isImportSpecifier);
                    if (target) {
                        const targetType = this.checker.getTypeAtLocation(target);
                        if (this.isGraphOrPregelType(targetType)) {
                            acc.push({ name: this.getText(target.name), node: target });
                        }
                    }
                }
            }
            return acc;
        };
        this.isGraphOrPregelType = (type) => {
            return (this.checker.isTypeAssignableTo(type, this.anyPregelType) ||
                this.checker.isTypeAssignableTo(type, this.anyGraphType));
        };
        this.program = program;
        this.sourceFile = sourceFile;
        this.inferFile = inferFile;
        this.checker = program.getTypeChecker();
        this.strict = (_a = options === null || options === void 0 ? void 0 : options.strict) !== null && _a !== void 0 ? _a : false;
        this.anyPregelType = this.findTypeByName("AnyPregel");
        this.anyGraphType = this.findTypeByName("AnyGraph");
    }
    getText(node) {
        return node.getText(this.sourceFile);
    }
    reduceChildren(node, fn, initial) {
        let acc = initial;
        function it(node) {
            acc = fn(acc, node);
            // @ts-expect-error
            ts.forEachChild(node, it.bind(this));
        }
        ts.forEachChild(node, it.bind(this));
        return acc;
    }
    static extractSchemas(target, options) {
        var _a, _b;
        if (!target.length)
            throw new Error("No graphs found");
        console.log(target);
        function getCommonPath(a, b) {
            const aSeg = path.normalize(a).split(path.sep);
            const bSeg = path.normalize(b).split(path.sep);
            const maxIter = Math.min(aSeg.length, bSeg.length);
            const result = [];
            for (let i = 0; i < maxIter; ++i) {
                if (aSeg[i] !== bSeg[i])
                    break;
                result.push(aSeg[i]);
            }
            return result.join(path.sep);
        }
        const isTestTarget = (check) => {
            return check.every((x) => typeof x.sourceFile === "string");
        };
        const projectDirname = isTestTarget(target)
            ? target.reduce((acc, item) => {
                if (!acc)
                    return path.dirname(item.sourceFile);
                return getCommonPath(acc, path.dirname(item.sourceFile));
            }, "")
            : __dirname;
        // This API is not well made for Windows, ensure that the paths are UNIX slashes
        const fsMap = new Map();
        const system = vfs.createFSBackedSystem(fsMap, projectDirname, ts);
        // TODO: investigate if we should create a PR in @typescript/vfs
        const oldReadFile = system.readFile.bind(system);
        system.readFile = (fileName) => { var _a; return (_a = oldReadFile(fileName)) !== null && _a !== void 0 ? _a : "// Non-existent file"; };
        const vfsPath = (inputPath) => {
            if (process.platform === "win32")
                return inputPath.replace(/\\/g, "/");
            return inputPath;
        };
        let compilerOptions = {
            noEmit: true,
            strict: true,
            allowUnusedLabels: true,
        };
        // Find tsconfig.json file
        const tsconfigPath = ts.findConfigFile(projectDirname, ts.sys.fileExists, "tsconfig.json");
        // Read tsconfig.json file
        if (tsconfigPath != null) {
            const tsconfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
            const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfigFile.config, ts.sys, path.dirname(tsconfigPath));
            compilerOptions = Object.assign(Object.assign({}, parsedTsconfig.options), compilerOptions);
        }
        const vfsHost = vfs.createVirtualCompilerHost(system, compilerOptions, ts);
        const host = vfsHost.compilerHost;
        const targetPaths = [];
        for (const item of target) {
            if (typeof item.sourceFile === "string") {
                targetPaths.push(Object.assign(Object.assign({}, item), { sourceFile: item.sourceFile }));
            }
            else {
                for (const { path: sourcePath, contents, main } of (_a = item.sourceFile) !== null && _a !== void 0 ? _a : []) {
                    fsMap.set(vfsPath(path.resolve(projectDirname, sourcePath)), contents);
                    if (main) {
                        targetPaths.push(Object.assign(Object.assign({}, item), { sourceFile: path.resolve(projectDirname, sourcePath) }));
                    }
                }
            }
        }
        const moduleCache = ts.createModuleResolutionCache(projectDirname, (x) => x);
        host.resolveModuleNameLiterals = (entries, containingFile, redirectedReference, options) => entries.flatMap((entry) => {
            const specifier = entry.text;
            // Force module resolution to use @langchain/langgraph from the local project
            // rather than from API/CLI.
            let targetFile = containingFile;
            if (OVERRIDE_RESOLVE.some((regex) => regex.test(specifier))) {
                // check if we're not already importing from node_modules
                if (!containingFile.split(path.sep).includes("node_modules")) {
                    // Doesn't matter if the file exists, only used to nudge `ts.resolveModuleName`
                    targetFile = path.resolve(projectDirname, "__langgraph__resolve.mts");
                }
            }
            return [
                ts.resolveModuleName(specifier, targetFile, options, host, moduleCache, redirectedReference),
            ];
        });
        const research = ts.createProgram({
            rootNames: [INFER_TEMPLATE_PATH, ...targetPaths.map((i) => i.sourceFile)],
            options: compilerOptions,
            host,
        });
        const researchTargets = [];
        for (const targetPath of targetPaths) {
            const extractor = new SubgraphExtractor(research, research.getSourceFile(targetPath.sourceFile), research.getSourceFile(INFER_TEMPLATE_PATH), options);
            const graphDirname = path.dirname(targetPath.sourceFile);
            const { sourceFile, inferFile, exports } = extractor.getAugmentedSourceFile(path.relative(projectDirname, targetPath.sourceFile), targetPath.exportSymbol, {
                allowImportingTsExtensions: (_b = compilerOptions.allowImportingTsExtensions) !== null && _b !== void 0 ? _b : false,
            });
            for (const { fileName, contents } of [sourceFile, inferFile]) {
                system.writeFile(vfsPath(path.resolve(graphDirname, fileName)), contents);
            }
            researchTargets.push({
                rootName: path.resolve(graphDirname, inferFile.fileName),
                exports,
            });
        }
        const extract = ts.createProgram({
            rootNames: researchTargets.map((i) => i.rootName),
            options: compilerOptions,
            host,
        });
        // Print out any diagnostics file that were detected before emitting
        // This may explain why sometimes the schema is invalid.
        const allDiagnostics = ts.getPreEmitDiagnostics(extract);
        for (const diagnostic of allDiagnostics) {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") + "\n";
            if (diagnostic.file) {
                const fileName = diagnostic.file.fileName;
                const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
                const fileLoc = `(${line + 1},${character + 1})`;
                message = `${fileName} ${fileLoc}: ${message}`;
            }
            console.log(message);
        }
        const schemaGenerator = (0, types_1.buildGenerator)(extract);
        const trySymbol = (symbol) => {
            var _a;
            let schema = undefined;
            try {
                schema = (_a = schemaGenerator === null || schemaGenerator === void 0 ? void 0 : schemaGenerator.getSchemaForSymbol(symbol)) !== null && _a !== void 0 ? _a : undefined;
            }
            catch (e) {
                console.warn(`Failed to obtain symbol "${symbol}":`, e === null || e === void 0 ? void 0 : e.message);
            }
            if (schema == null)
                return undefined;
            const definitions = schema.definitions;
            if (definitions == null)
                return schema;
            const toReplace = Object.keys(definitions).flatMap((key) => {
                const replacedKey = key.includes("import(")
                    ? key.replace(/import\(.+@langchain[\\/]core.+\)\./, "")
                    : key;
                if (key !== replacedKey && definitions[replacedKey] == null) {
                    return [
                        {
                            source: key,
                            target: replacedKey,
                            sourceRef: `#/definitions/${key}`,
                            targetRef: `#/definitions/${replacedKey}`,
                        },
                    ];
                }
                return [];
            });
            for (const { source, target } of toReplace) {
                definitions[target] = definitions[source];
                delete definitions[source];
            }
            const refMap = toReplace.reduce((acc, item) => {
                acc[item.sourceRef] = item.targetRef;
                return acc;
            }, {});
            return JSON.parse(JSON.stringify(schema, (_, value) => {
                if (typeof value === "string" && refMap[value])
                    return refMap[value];
                return value;
            }));
        };
        return researchTargets.map(({ exports }) => Object.fromEntries(exports.map(({ typeName, graphName }) => [
            graphName,
            {
                state: trySymbol(`${typeName}__update`),
                input: trySymbol(`${typeName}__input`),
                output: trySymbol(`${typeName}__output`),
                config: trySymbol(`${typeName}__config`),
            },
        ])));
    }
}
exports.SubgraphExtractor = SubgraphExtractor;
