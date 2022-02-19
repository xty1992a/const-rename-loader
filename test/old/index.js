const path = require("path");
const fs = require("fs-extra");
const mkdirp = require("mkdirp");
const md5 = require("md5");
const SplitChunksPlugin = require("webpack/lib/optimize/SplitChunksPlugin");
const { ConcatSource } = require("webpack-sources");
const { promoteRelativePath } = require("@tarojs/helper");
const getAppConfig = require("./get-app-config");

const isString = (arg) => typeof arg === "string";
const isFunction = (arg) => typeof arg === "function";
const isArray = (arg) => Array.isArray(arg);

const PLUGIN_NAME = "MiniSplitChunkPlugin";
const SUB_COMMON_DIR = "sub-common";
const SUB_VENDORS_NAME = "sub-vendors";
let FileExtsMap;
(function (FileExtsMap) {
  FileExtsMap["JS"] = ".js";
  FileExtsMap["JS_MAP"] = ".js.map";
  FileExtsMap["STYLE"] = ".wxss";
})(FileExtsMap || (FileExtsMap = {}));

module.exports = class MiniSplitChunksPlugin extends SplitChunksPlugin {
  constructor(options = {}) {
    super();
    /**
     * 自动驱动 tapAsync
     */
    this.tryAsync = (fn) => async (arg, callback) => {
      try {
        await fn(arg);
        callback();
      } catch (err) {
        callback(err);
      }
    };
    this.options = null;
    this.subCommonDeps = new Map();
    this.chunkSubCommons = new Map();
    this.subPackagesVendors = new Map();
    this.distPath = "";
    this.exclude = options.exclude || [];
  }
  apply(compiler) {
    var _a, _b;
    this.context = compiler.context;
    this.subPackages = this.getSubpackageConfig(compiler).map((subPackage) =>
      Object.assign(Object.assign({}, subPackage), {
        root: this.formatSubRoot(subPackage.root),
      })
    );
    this.subRoots = this.subPackages.map((subPackage) => subPackage.root);
    this.subRootRegExps = this.subRoots.map(
      (subRoot) => new RegExp(`^${subRoot}\\/`)
    );
    this.distPath =
      (_b =
        (_a =
          compiler === null || compiler === void 0
            ? void 0
            : compiler.options) === null || _a === void 0
          ? void 0
          : _a.output) === null || _b === void 0
        ? void 0
        : _b.path;
    this.isDevMode = compiler.options.mode === "development";
    /**
     * 调用父类SplitChunksPlugin的apply方法，注册相关处理事件
     */
    super.apply(compiler);
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.optimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        var _a, _b, _c, _d, _e;
        this.subCommonDeps = new Map();
        this.chunkSubCommons = new Map();
        this.subPackagesVendors = new Map();
        /**
         * 找出分包入口chunks
         */
        const subChunks = chunks.filter((chunk) => this.isSubChunk(chunk));
        if (subChunks.length === 0) {
          return;
        }
        subChunks.forEach((subChunk) => {
          const modules = Array.from(subChunk.modulesIterable);
          modules.map((module) => {
            if (this.hasExclude() && this.isExcludeModule(module)) {
              return;
            }
            const chunks = Array.from(module.chunksIterable);
            /**
             * 找出没有被主包引用，且被多个分包引用的module，并记录在subCommonDeps中
             */
            if (!this.hasMainChunk(chunks) && this.isSubsDep(chunks)) {
              let depPath = "";
              let depName = "";
              if (module.resource) {
                depPath = module.resource;
              } else {
                depPath = module._identifier;
              }
              if (this.isDevMode) {
                /**
                 * 避免开发模式下，清除sub-common源目录后，触发重新编译时，sub-common目录缺失无变化的chunk导致文件copy失败的问题
                 */
                depName = md5(depPath + new Date().getTime());
              } else {
                depName = md5(depPath);
              }
              if (!this.subCommonDeps.has(depName)) {
                const subCommonDepChunks = new Set(
                  chunks.map((chunk) => chunk.name)
                );
                this.subCommonDeps.set(depName, {
                  identifier: module._identifier,
                  resource: module.resource,
                  chunks: subCommonDepChunks,
                });
              } else {
                const subCommonDep = this.subCommonDeps.get(depName);
                chunks.map((chunk) => subCommonDep.chunks.add(chunk.name));
                this.subCommonDeps.set(depName, subCommonDep);
              }
            }
          });
        });
        /**
         * 用新的option配置生成新的cacheGroups配置
         */
        this.options = SplitChunksPlugin.normalizeOptions(
          Object.assign(
            Object.assign(
              {},
              (_b =
                (_a =
                  compiler === null || compiler === void 0
                    ? void 0
                    : compiler.options) === null || _a === void 0
                  ? void 0
                  : _a.optimization) === null || _b === void 0
                ? void 0
                : _b.splitChunks
            ),
            {
              cacheGroups: Object.assign(
                Object.assign(
                  Object.assign(
                    {},
                    (_e =
                      (_d =
                        (_c =
                          compiler === null || compiler === void 0
                            ? void 0
                            : compiler.options) === null || _c === void 0
                          ? void 0
                          : _c.optimization) === null || _d === void 0
                        ? void 0
                        : _d.splitChunks) === null || _e === void 0
                      ? void 0
                      : _e.cacheGroups
                  ),
                  this.getSubPackageVendorsCacheGroup()
                ),
                this.getSubCommonCacheGroup()
              ),
            }
          )
        );
      });
      /**
       * 收集分包下的sub-vendors和sub-common下的公共模块信息
       */
      compilation.hooks.afterOptimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        const existSubCommonDeps = new Map();
        chunks.forEach((chunk) => {
          const chunkName = chunk.name;
          if (this.matchSubVendors(chunk)) {
            const subRoot = this.subRoots.find((subRoot) =>
              new RegExp(`^${subRoot}\\/`).test(chunkName)
            );
            this.subPackagesVendors.set(subRoot, chunk);
          }
          if (this.matchSubCommon(chunk)) {
            const depName = chunkName.replace(
              new RegExp(`^${SUB_COMMON_DIR}\\/(.*)`),
              "$1"
            );
            if (this.subCommonDeps.has(depName)) {
              existSubCommonDeps.set(depName, this.subCommonDeps.get(depName));
            }
          }
        });
        this.setChunkSubCommons(existSubCommonDeps);
        this.subCommonDeps = existSubCommonDeps;
      });
      /**
       * 往分包page头部添加require
       */
      compilation.chunkTemplate.hooks.renderWithEntry.tap(
        PLUGIN_NAME,
        (modules, chunk) => {
          if (this.isSubChunk(chunk)) {
            const chunkName = chunk.name;
            const chunkSubRoot = this.subRoots.find((subRoot) =>
              new RegExp(`^${subRoot}\\/`).test(chunkName)
            );
            const chunkAbsulutePath = path.resolve(this.distPath, chunkName);
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
                chunkAbsulutePath,
                subVendorsAbsolutePath
              );
              source.add(`require(${JSON.stringify(relativePath)});\n`);
            }
            // require sub-common下的模块
            if (subCommon.length > 0) {
              subCommon.forEach((moduleName) => {
                const moduleAbsulutePath = path.resolve(
                  this.distPath,
                  chunkSubRoot,
                  SUB_COMMON_DIR,
                  moduleName
                );
                const relativePath = this.getRealRelativePath(
                  chunkAbsulutePath,
                  moduleAbsulutePath
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
    });
    compiler.hooks.emit.tapAsync(
      PLUGIN_NAME,
      this.tryAsync((compilation) => {
        const assets = compilation.assets;
        const wxmls = Object.getOwnPropertyNames(assets).filter((name) =>
          /\.wxml$/.test(name)
        );
        const subChunks = compilation.entries.filter(
          (entry) => entry.miniType === "PAGE" && this.isSubChunk(entry)
        );
        subChunks.forEach((subChunk) => {
          const subChunkName = subChunk.name;
          const subRoot = this.subRoots.find((subRoot) =>
            new RegExp(`^${subRoot}\\/`).test(subChunkName)
          );
          const subVendorsWxssPath = path.join(
            subRoot,
            `${SUB_VENDORS_NAME}${FileExtsMap.STYLE}`
          );
          const subCommon = [...(this.chunkSubCommons.get(subChunkName) || [])];

          const fillComponentWxss = (subVendorsWxssPath) => {
            const subChunkPath = this.formatSystemPath(
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

          const chunkWxssName = `${subChunkName}${FileExtsMap.STYLE}`;
          const wxssAbsulutePath = path.resolve(this.distPath, chunkWxssName);
          const pageWxssSource = new ConcatSource();
          if (assets[this.formatSystemPath(subVendorsWxssPath)]) {
            fillComponentWxss(subVendorsWxssPath);
            const subVendorsAbsolutePath = path.resolve(
              this.distPath,
              subVendorsWxssPath
            );
            const relativePath = this.getRealRelativePath(
              wxssAbsulutePath,
              subVendorsAbsolutePath
            );
            pageWxssSource.add(`@import ${JSON.stringify(relativePath)};\n`);
          }
          if (subCommon.length > 0) {
            subCommon.forEach((moduleName) => {
              const wxssFileName = `${moduleName}${FileExtsMap.STYLE}`;
              const wxssFilePath = path.join(SUB_COMMON_DIR, wxssFileName);
              if (assets[this.formatSystemPath(wxssFilePath)]) {
                const moduleAbsulutePath = path.resolve(
                  this.distPath,
                  subRoot,
                  SUB_COMMON_DIR,
                  wxssFileName
                );
                const relativePath = this.getRealRelativePath(
                  wxssAbsulutePath,
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
        const needCopySubRoots = chunks.reduce((set, chunkName) => {
          const subRoot = this.subRoots.find((subRoot) =>
            new RegExp(`^${subRoot}\\/`).test(chunkName)
          );
          if (subRoot) {
            set.add(subRoot);
          }
          return set;
        }, new Set());
        /**
         * sub-common下模块copy到对应分包路径下：分包/sub-common
         */
        needCopySubRoots.forEach((needCopySubRoot) => {
          for (const key in FileExtsMap) {
            const ext = FileExtsMap[key];
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
            mkdirp.sync(targetDirPath);
            if (fs.pathExistsSync(sourcePath)) {
              fs.outputFileSync(targetPath, fs.readFileSync(sourcePath));
            }
          }
        });
      });
      /**
       * 复制完成后清理根目录的sub-common
       */
      fs.emptyDirSync(subCommonPath);
      fs.removeSync(subCommonPath);
    });
  }
  /**
   * 根据 webpack entry 配置获取入口文件路径
   */
  getAppEntry(compiler) {
    const originalEntry = compiler.options.entry;
    return path.resolve(this.context, originalEntry.app[0]);
  }
  /**
   * 获取分包配置
   */
  getSubpackageConfig(compiler) {
    // const appEntry = this.getAppEntry(compiler)
    // const appConfigPath = this.getConfigFilePath(appEntry)
    // const appConfig = readConfig(appConfigPath)
    const appConfig = getAppConfig();
    return appConfig.subPackages || appConfig.subpackages || [];
  }
  /**
   * 根据 app、页面、组件的路径获取对应的 config 配置文件的路径
   */
  // getConfigFilePath(filePath) {
  //   return resolveMainFilePath(`${filePath.replace(path.extname(filePath), '')}.config`)
  // }
  /**
   * 去掉尾部的/
   */
  formatSubRoot(subRoot) {
    const lastApl = subRoot[subRoot.length - 1];
    if (lastApl === "/") {
      subRoot = subRoot.slice(0, subRoot.length - 1);
    }
    return subRoot;
  }
  isSubChunk(chunk) {
    const isSubChunk = this.subRootRegExps.find((subRootRegExp) =>
      subRootRegExp.test(chunk.name)
    );
    return !!isSubChunk;
  }
  /**
   * match *\/sub-vendors
   */
  matchSubVendors(chunk) {
    const subVendorsRegExps = this.subRoots.map(
      (subRoot) =>
        new RegExp(
          `^${this.formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME))}$`
        )
    );
    const isSubVendors = subVendorsRegExps.find((subVendorsRegExp) =>
      subVendorsRegExp.test(chunk.name)
    );
    return !!isSubVendors;
  }
  /**
   * match sub-common\/*
   */
  matchSubCommon(chunk) {
    return new RegExp(`^${SUB_COMMON_DIR}\\/`).test(chunk.name);
  }
  /**
   * 判断module有没被主包引用
   */
  hasMainChunk(chunks) {
    const chunkNames = chunks.map((chunk) => chunk.name);
    let hasMainChunk = false;
    /**
     * 遍历chunk，如果其中有一个chunk，无法匹配分包root，则视为非分包的chunk
     */
    chunkNames.forEach((chunkName) => {
      const isMatch = this.subRootRegExps.find((subRootRegExp) =>
        subRootRegExp.test(chunkName)
      );
      if (!isMatch) {
        hasMainChunk = true;
      }
    });
    return hasMainChunk;
  }
  /**
   * 判断该module有没被多个分包引用
   */
  isSubsDep(chunks) {
    const chunkNames = chunks.map((chunk) => chunk.name);
    const chunkSubRoots = new Set();
    chunkNames.forEach((chunkName) => {
      this.subRoots.forEach((subRoot) => {
        if (new RegExp(`^${subRoot}\\/`).test(chunkName)) {
          chunkSubRoots.add(subRoot);
        }
      });
    });
    return [...chunkSubRoots].length > 1;
  }
  /**
   * 仅分包有引用的module抽取到分包下的sub-vendors
   */
  getSubPackageVendorsCacheGroup() {
    const subPackageVendorsCacheGroup = {};
    this.subRoots.forEach((subRoot) => {
      subPackageVendorsCacheGroup[subRoot] = {
        test: (module, chunks) => {
          if (this.hasExclude() && this.isExcludeModule(module)) {
            return false;
          }
          return chunks.every((chunk) =>
            new RegExp(`^${subRoot}\\/`).test(chunk.name)
          );
        },
        name: this.formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME)),
        minChunks: 2,
        priority: 10000,
      };
    });
    return subPackageVendorsCacheGroup;
  }
  /**
   * 没有被主包引用， 且被多个分包引用， 提取成单个模块，输出到sub-common下
   */
  getSubCommonCacheGroup() {
    const subCommonCacheGroup = {};
    this.subCommonDeps.forEach((depInfo, depName) => {
      const cacheGroupName = this.formatSystemPath(
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
  hasExclude() {
    return isArray(this.exclude) && this.exclude.length > 0;
  }
  isExcludeModule(module) {
    const moduleResource = module.resource;
    for (let i = 0; i < this.exclude.length; i++) {
      const excludeItem = this.exclude[i];
      if (isString(excludeItem) && excludeItem === moduleResource) {
        return true;
      }
      if (isFunction(excludeItem) && excludeItem(module)) {
        return true;
      }
    }
    return false;
  }
  setChunkSubCommons(subCommonDeps) {
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
  getRealRelativePath(from, to) {
    return promoteRelativePath(path.relative(from, to));
  }
  /**
   * 将window系统下的路径分隔符转成/
   */
  formatSystemPath(p) {
    return p.replace(/\\/g, "/");
  }
};
