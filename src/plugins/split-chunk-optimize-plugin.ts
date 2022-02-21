import path from "path";
import md5 from "md5";
import * as fs from "fs-extra";
import { execSync } from "child_process";
// @ts-ignore
import SplitChunksPlugin from "webpack/lib/optimize/SplitChunksPlugin";
import { ConcatSource } from "webpack-sources";
import { promoteRelativePath } from "@tarojs/helper";
import type webpack from "webpack";
import { getTaroAppConfig as getAppConfig } from "../utils";
import * as types from "../type";
import { Subpackage } from "../type";

//# region helper
const isString = (arg: any) => typeof arg === "string";
const isFunction = (arg: string) => typeof arg === "function";

const PLUGIN_NAME = "MiniSplitChunkPlugin";
const SUB_COMMON_DIR = "sub-common";
const SUB_VENDORS_NAME = "sub-vendors";
const SUB_COMMON_EXP = new RegExp(`^${SUB_COMMON_DIR}\\/`);
const FileExtMap: Record<string, string> = {
  JS: ".js",
  JS_MAP: ".js.map",
  STYLE: ".wxss",
};

/*
enum FileExtsMap {
JS= '.js',
JS_MAP= '.js.map',
STYLE= '.wxss'
}
* */

//# endregion

type DepRecord = Record<string, any>;

export class MiniSplitChunksPlugin extends SplitChunksPlugin {
  /**
   * 自动驱动 tapAsync
   */
  tryAsync =
    (fn: (...args: any[]) => Promise<any>) =>
    async (arg: any, callback: Function) => {
      try {
        await fn(arg);
        callback();
      } catch (err) {
        callback(err);
      }
    };
  options = null;
  subCommonDeps: Map<string, DepRecord> = new Map();
  chunkSubCommons = new Map();
  subPackagesVendors = new Map();
  distPath = "";
  exclude: /*(webpack.compilation.Module & Record<string, any>)*/ ((
    str: string
  ) => boolean)[] = [];
  context?: string; // webpack.Compiler.context

  subPackages: Subpackage[] = [];

  subRoots: string[] = [];

  subRootRegExps: RegExp[] = [];
  subVendorsRegExps: RegExp[] = [];
  isDevMode = false;

  constructor(options: Record<string, any> = {}) {
    super();
    this.exclude = (options.exclude || []).map((item: string | Function) => {
      if (isString(item)) return (moduleName: string) => moduleName === item;
      return item;
    });
  }

  setSubPackages(compiler: webpack.Compiler) {
    this.subPackages = this.getSubpackageConfig(compiler);
    this.subRoots = this.subPackages.map((subPackage) => subPackage.root);
    this.subRootRegExps = this.subRoots.map(
      (subRoot) => new RegExp(`^${subRoot}\\/`)
    );
    this.subVendorsRegExps = this.subRoots.map(
      (subRoot) =>
        new RegExp(
          `^${formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME))}$`
        )
    );
  }

  apply(compiler: webpack.Compiler) {
    this.context = compiler.context;
    this.setSubPackages(compiler);
    this.distPath = compiler?.options?.output?.path ?? "";
    this.isDevMode = compiler.options.mode === "development";
    /**
     * 调用父类SplitChunksPlugin的apply方法，注册相关处理事件
     */
    super.apply(compiler);
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.optimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        try {
          this.subCommonDeps = new Map();
          this.chunkSubCommons = new Map();
          this.subPackagesVendors = new Map();
          const subChunks = chunks.filter((chunk) => this.isSubChunk(chunk));
          if (!subChunks.length) return;

          const now = Date.now();
          subChunks.forEach((subChunk) => {
            [...subChunk.modulesIterable].forEach(
              (module: webpack.compilation.Module & Record<string, any>) => {
                if (this.isExcludeModule(module)) return;
                const chunks = Array.from(module.chunksIterable);
                if (this.depsByMainChunk(chunks)) return;
                if (!this.depsByMultiSubs(chunks)) return;
                // 依赖名称
                const depName = md5(
                  (module.resource || module._identifier) +
                    (this.isDevMode ? now : "")
                );
                if (!this.subCommonDeps.has(depName)) {
                  this.subCommonDeps.set(depName, {
                    identifier: module._identifier,
                    resource: module.resource,
                    chunks: new Set(),
                  });
                }
                const subCommonDep = this.subCommonDeps.get(depName);
                if (!subCommonDep) return;
                chunks.forEach((chunk) => subCommonDep.chunks.add(chunk.name));
                this.subCommonDeps.set(depName, subCommonDep);
              }
            );
          });

          const options: webpack.Options.SplitChunksOptions = {
            ...compiler?.options.optimization?.splitChunks,
            cacheGroups: {
              ...resolveCacheGroups(compiler),
              ...this.getSubPackageVendorsCacheGroup(),
              ...this.getSubCommonCacheGroup(),
            },
          };
          this.options = SplitChunksPlugin.normalizeOptions(options);
        } catch (e) {
          console.log(e);
          console.log("error");
        }
      });
      /**
       * 收集分包下的sub-vendors和sub-common下的公共模块信息
       */
      compilation.hooks.afterOptimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        // console.log('after optimize chunks')
        const existSubCommonDeps: Map<string, DepRecord> = new Map();
        chunks.forEach((chunk) => {
          const chunkName = chunk.name;
          if (this.matchSubVendors(chunk)) {
            const subRoot = this.subRoots.find((subRoot) =>
              chunkName.startsWith(subRoot)
            );
            this.subPackagesVendors.set(subRoot, chunk);
          }
          if (this.matchSubCommon(chunk)) {
            const depName = chunkName.replace(
              new RegExp(`^${SUB_COMMON_DIR}\\/(.*)`),
              "$1"
            );
            if (this.subCommonDeps.has(depName)) {
              const dep = this.subCommonDeps.get(depName);
              if (!dep) return;
              existSubCommonDeps.set(depName, dep);
            }
          }
        });
        this.setChunkSubCommons(existSubCommonDeps);
        this.subCommonDeps = existSubCommonDeps;
        // console.log('after optimize chunks done')
      });
      /**
       * 往分包page头部添加require
       */
      // @ts-ignore
      compilation.chunkTemplate.hooks.renderWithEntry.tap(
        PLUGIN_NAME,
        // @ts-ignore
        (modules, chunk) => {
          if (this.isSubChunk(chunk)) {
            const chunkName = chunk.name;
            const chunkSubRoot =
              this.subRoots.find((subRoot) =>
                new RegExp(`^${subRoot}\\/`).test(chunkName)
              ) || "";
            const chunkAbsolutePath = path.resolve(this.distPath, chunkName);
            const source = new ConcatSource();
            const hasSubVendors = this.subPackagesVendors.has(chunkSubRoot);
            const subVendors = this.subPackagesVendors.get(chunkSubRoot);
            const subCommon = [...(this.chunkSubCommons.get(chunkName) || [])];
            /**
             * require该分包下的sub-vendors
             */
            if (hasSubVendors) {
              const subVendorsAbsolutePath = path.resolve(
                this.distPath,
                subVendors.name
              );
              const relativePath = this.getRealRelativePath(
                chunkAbsolutePath,
                subVendorsAbsolutePath
              );
              source.add(`require(${JSON.stringify(relativePath)});\n`);
            }
            // require sub-common下的模块
            if (subCommon.length > 0) {
              subCommon.forEach((moduleName) => {
                const moduleAbsolutePath = path.resolve(
                  this.distPath,
                  chunkSubRoot,
                  SUB_COMMON_DIR,
                  moduleName
                );
                const relativePath = this.getRealRelativePath(
                  chunkAbsolutePath,
                  moduleAbsolutePath
                );
                source.add(`require(${JSON.stringify(relativePath)});\n`);
              });
            }
            source.add(modules);
            source.add(";");
            return source;
          }
        }
      );
      // console.log('compilation done')
    });
    compiler.hooks.emit.tapAsync(
      PLUGIN_NAME,
      this.tryAsync(async (compilation: webpack.compilation.Compilation) => {
        const assets = compilation.assets;
        const wxmls = Object.getOwnPropertyNames(assets).filter((name) =>
          /\.wxml$/.test(name)
        );
        const subChunks = compilation.entries.filter(
          (entry) => entry.miniType === "PAGE" && this.isSubChunk(entry)
        );
        subChunks.forEach((subChunk) => {
          const subChunkName = subChunk.name;
          const subRoot =
            this.subRoots.find((subRoot) =>
              new RegExp(`^${subRoot}\\/`).test(subChunkName)
            ) || "";
          const subVendorsWxssPath = path.join(
            subRoot,
            `${SUB_VENDORS_NAME}${FileExtMap.STYLE}`
          );
          const subCommon = [...(this.chunkSubCommons.get(subChunkName) || [])];

          const fillComponentWxss = (subVendorsWxssPath: string) => {
            const subChunkPath = formatSystemPath(
              subVendorsWxssPath.replace(
                new RegExp(`${SUB_VENDORS_NAME}\.wxss$`),
                ""
              )
            );
            for (const wxml of wxmls) {
              if (!wxml.startsWith(subChunkPath)) continue;

              const source = new ConcatSource();
              const componentWxssPath = wxml.replace(/\.wxml$/, ".wxss");
              const wxssAbsulutePath = path.resolve(
                this.distPath,
                componentWxssPath
              );
              const subVendorsAbsolutePath = path.resolve(
                this.distPath,
                subVendorsWxssPath
              );
              const relativePath = this.getRealRelativePath(
                wxssAbsulutePath,
                subVendorsAbsolutePath
              );
              const importStatement = `@import ${JSON.stringify(
                relativePath
              )};`;
              if (assets[componentWxssPath]) {
                if (
                  assets[componentWxssPath].source().includes(importStatement)
                )
                  continue;

                source.add(assets[componentWxssPath].source());
                source.add("\n");
                source.add(importStatement);
              } else {
                // 没有添加 chunk, 手动添加
                source.add(importStatement);
              }
              assets[componentWxssPath] = {
                size: () => source.source().length,
                source: () => source.source(),
              };
            }
          };

          const chunkWxssName = `${subChunkName}${FileExtMap.STYLE}`;
          const wxssAbsolutePath = path.resolve(this.distPath, chunkWxssName);
          const pageWxssSource = new ConcatSource();
          if (assets[formatSystemPath(subVendorsWxssPath)]) {
            fillComponentWxss(subVendorsWxssPath);
            const subVendorsAbsolutePath = path.resolve(
              this.distPath,
              subVendorsWxssPath
            );
            const relativePath = this.getRealRelativePath(
              wxssAbsolutePath,
              subVendorsAbsolutePath
            );
            pageWxssSource.add(`@import ${JSON.stringify(relativePath)};\n`);
          }
          if (subCommon.length > 0) {
            subCommon.forEach((moduleName) => {
              const wxssFileName = `${moduleName}${FileExtMap.STYLE}`;
              const wxssFilePath = path.join(SUB_COMMON_DIR, wxssFileName);
              if (assets[formatSystemPath(wxssFilePath)]) {
                const moduleAbsulutePath = path.resolve(
                  this.distPath,
                  subRoot,
                  SUB_COMMON_DIR,
                  wxssFileName
                );
                const relativePath = this.getRealRelativePath(
                  wxssAbsolutePath,
                  moduleAbsulutePath
                );
                pageWxssSource.add(
                  `@import ${JSON.stringify(`${relativePath}`)};\n`
                );
              }
            });
          }
          if (assets[chunkWxssName]) {
            const originSource = assets[chunkWxssName].source();
            pageWxssSource.add(originSource);
          }
          assets[chunkWxssName] = {
            size: () => pageWxssSource.source().length,
            source: () => pageWxssSource.source(),
          };
        });
      })
    );
    compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
      const subCommonPath = path.resolve(this.distPath, SUB_COMMON_DIR);
      if (!fs.pathExistsSync(subCommonPath)) {
        return;
      }
      this.subCommonDeps.forEach((subCommonDep, depName) => {
        const chunks = [...subCommonDep.chunks];
        const needCopySubRoots: Set<string> = chunks.reduce(
          (set: Set<string>, chunkName) => {
            const subRoot = this.judgeSubRoot(chunkName);
            if (subRoot) {
              set.add(subRoot);
            }
            return set;
          },
          new Set()
        );
        /**
         * sub-common下模块copy到对应分包路径下：分包/sub-common
         */
        needCopySubRoots.forEach((needCopySubRoot) => {
          for (const key in FileExtMap) {
            const ext = FileExtMap[key];
            const fileNameWithExt = `${depName}${ext}`;
            const sourcePath = path.resolve(subCommonPath, fileNameWithExt);
            const targetDirPath = path.resolve(
              this.distPath,
              needCopySubRoot,
              SUB_COMMON_DIR
            );
            const targetPath = path.resolve(targetDirPath, fileNameWithExt);
            /**
             * 检查是否存在目录，没有则创建
             */
            execSync(`mkdir -p ${targetDirPath}`);
            if (fs.pathExistsSync(sourcePath)) {
              fs.outputFileSync(targetPath, fs.readFileSync(sourcePath));
            }
          }
        });
      });
      execSync(`rm -rf ${subCommonPath}`);
    });
  }

  judgeSubRoot(chunkName: string) {
    const index = this.subRootRegExps.findIndex((reg) => reg.test(chunkName));
    return this.subRoots[index] || "";
  }

  /**
   * 获取分包配置
   */
  getSubpackageConfig(compiler: webpack.Compiler): types.Subpackage[] {
    const appConfig = getAppConfig({
      appPath: path.resolve(compiler.context, "src/app.tsx"),
    });
    const sublist: types.Subpackage[] =
      appConfig.subPackages || appConfig.subpackages || [];
    return sublist.map(({ root, ...rest }) => ({
      ...rest,
      root: formatSubRoot(root),
    }));
  }

  isSubChunk(chunk: webpack.Chunk) {
    return this.subRootRegExps.some((subRootRegExp) =>
      subRootRegExp.test(chunk.name)
    );
  }

  /**
   * match *\/sub-vendors
   */
  matchSubVendors(chunk: webpack.Chunk) {
    return this.subVendorsRegExps.some((exp) => exp.test(chunk.name));
  }

  /**
   * match sub-common\/*
   */
  matchSubCommon(chunk: webpack.Chunk) {
    return chunk.name.startsWith(SUB_COMMON_DIR);
  }

  /**
   * 判断module有没被主包引用
   *
   * 条件为其下的chunk中，某一个不在分包目录下。则认为该模块应分配到主包
   */
  depsByMainChunk(chunks: webpack.Chunk[]) {
    return chunks.some(
      ({ name }) => !this.subRoots.some((root) => name.startsWith(root))
    );
  }

  /**
   * 判断该module有没被多个分包引用
   *
   * 条件为其下到chunks中，分布在至少两个分包
   */
  depsByMultiSubs(chunks: webpack.Chunk[]) {
    const roots = chunks
      .map(({ name }) => this.subRoots.find((root) => name.startsWith(root)))
      .filter(Boolean);
    return new Set(roots).size > 1;
  }

  /**
   * 仅分包有引用的module抽取到分包下的sub-vendors
   */
  getSubPackageVendorsCacheGroup() {
    type CacheGroup = Record<string, webpack.Options.CacheGroupsOptions>;
    return this.subRoots.reduce(
      (acc: CacheGroup, subRoot) => ({
        ...acc,
        [subRoot]: {
          test: (
            module: webpack.compilation.Module,
            chunks: webpack.Chunk[]
          ) => {
            if (this.isExcludeModule(module)) return false;
            return chunks.every(({ name }) => name.startsWith(subRoot));
          },
          name: formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME)),
          minChunks: 2,
          priority: 10000,
        },
      }),
      Object.create(null)
    );
  }

  /**
   * 没有被主包引用， 且被多个分包引用， 提取成单个模块，输出到sub-common下
   */
  getSubCommonCacheGroup() {
    const subCommonCacheGroup: Record<
      string,
      webpack.Options.CacheGroupsOptions
    > = {};
    this.subCommonDeps.forEach((depInfo, depName) => {
      const cacheGroupName = formatSystemPath(
        path.join(SUB_COMMON_DIR, depName)
      );
      subCommonCacheGroup[cacheGroupName] = {
        name: cacheGroupName,
        test: (module) => {
          if (!module.resource) {
            return module._identifier === depInfo.identifier;
          }
          return module.resource === depInfo.resource;
        },
        priority: 1000,
      };
    });
    return subCommonCacheGroup;
  }

  isExcludeModule(module: webpack.compilation.Module & Record<string, any>) {
    if (!this.exclude.length) return false;
    return this.exclude.some((fn) => fn(module.resource));
  }

  setChunkSubCommons(subCommonDeps: Map<string, DepRecord>) {
    const chunkSubCommons = new Map();
    subCommonDeps.forEach((depInfo, depName) => {
      const chunks = [...depInfo.chunks];
      chunks.forEach((chunk) => {
        if (chunkSubCommons.has(chunk)) {
          const chunkSubCommon = chunkSubCommons.get(chunk);
          chunkSubCommon.add(depName);
          chunkSubCommons.set(chunk, chunkSubCommon);
        } else {
          chunkSubCommons.set(chunk, new Set([depName]));
        }
      });
    });
    this.chunkSubCommons = chunkSubCommons;
  }

  /**
   * 获取page相对于公共模块的路径
   */
  getRealRelativePath(from: string, to: string) {
    return promoteRelativePath(path.relative(from, to));
  }

  /**
   * 将window系统下的路径分隔符转成/
   */
}

//# region helpers

// 返回compiler原本设置的cacheGroup,如果非对象类型，强制返回空对象
function resolveCacheGroups(compiler: webpack.Compiler) {
  const chunks = compiler?.options.optimization
    ?.splitChunks as webpack.Options.SplitChunksOptions;
  if (!chunks) return {};
  let oldCacheGroups = chunks?.cacheGroups ?? {};
  switch (typeof oldCacheGroups) {
    case "boolean":
    case "bigint":
    case "function":
    case "number":
    case "string":
      return {};
  }
  if (oldCacheGroups instanceof RegExp) return {};
  return oldCacheGroups;
}

function formatSystemPath(p: string) {
  return p.replace(/\\/g, "/");
}

function formatSubRoot(subRoot: string) {
  const lastApl = subRoot[subRoot.length - 1];
  if (lastApl === "/") {
    subRoot = subRoot.slice(0, subRoot.length - 1);
  }
  return subRoot;
}

//# endregion
