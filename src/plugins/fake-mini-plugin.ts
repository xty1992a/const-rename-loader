/*
* 本插件劫持了taro的mini-plugin。
* mini-plugin会在webpack编译之前，搜寻全项目的代码，找出其中的页面，组件，插件等。
* 比较耗时。
* 本插件会在搜寻结束后，将搜寻结果缓存到硬盘。
* 下次启动时，如有缓存，将直接启用缓存，跳过搜寻。
* */

import chalk from 'chalk'
import webpack from 'webpack'
import {promises as fs} from 'fs'
import path from 'path'
import {execSync} from 'child_process'
import * as types from '../type'

function obj2Map(obj: Record<string, any>) {
  const map = new Map()
  Object.entries(obj)
    .forEach(([k, v]) => {
      map.set(k, v)
    })
  return map
}

function map2obj(map: Map<string, any>) {
  const obj: Record<string, any> = {}
  map.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

export function FakePluginFactory(cls: any, {root}: types.FakePluginOption) {
  const CACHE_DIR = root('.cache/fake-plugin/cache.json')
  const PURE_DIR = CACHE_DIR.replace(root('.'), '')

  return class FakeMiniPlugin extends cls {
      //# region helper

      usedCache = false

      async readCache() {
        try {
          const jsonString = await fs.readFile(CACHE_DIR, 'utf-8')
          return JSON.parse(jsonString)
        } catch (e) {
          return null
        }
      }

      async saveCache(json: Record<string, any>) {
        try {
          execSync(`mkdir -p ${path.dirname(CACHE_DIR)}`)
          await fs.writeFile(root(CACHE_DIR), JSON.stringify(json), 'utf-8')
          return true
        } catch (e) {
          return false
        }
      }

      //# endregion

      restoreFromCache(cache: Record<string, any>, compiler: webpack.Compiler) {
        if (!cache) return console.log(chalk.blueBright('未发现缓存，'))
        console.log(chalk.green('发现缓存，跳过搜寻'))
        console.log(chalk.bgWhiteBright(chalk.black(` 如需清除缓存，删除${PURE_DIR} 或执行 yarn delcache `)))
        const {
          appConfig,
          pages,
          taroFileTypeMap,
          components,
          pageConfigs,
          addedComponents,
          pageComponentsDependenciesMap,
        } = cache

        this.errors = []
        this.pages = new Set()
        this.components = new Set()
        this.pageConfigs = obj2Map(pageConfigs)
        Object
          .entries(pageComponentsDependenciesMap)
          .forEach(([k, v]: any[]) => {
            pageComponentsDependenciesMap[k] = new Set(v)
          })

        this.pageComponentsDependenciesMap = this.pageComponentsDependenciesMap || obj2Map(pageComponentsDependenciesMap)
        this.tabBarIcons = new Set()
        this.quickappStyleFiles = new Set()
        this.addedComponents = new Set(addedComponents)
        this.appConfig = appConfig

        // @ts-ignore
        compiler.appConfig = appConfig

        const innerMap = cls.getTaroFileTypeMap()
        Object.entries(taroFileTypeMap)
          .forEach(([k, v]: any[]) => {
            innerMap[k] = {
              ...v,
              importStyles: new Set(v.importStyles),
            }
          })

        this.pages = new Set([...this.pages, ...pages])
        this.components = new Set([...this.components, ...components])

        this.addEntries(compiler)
      }

      async saveCacheFromIns() {

        const pages = Array.from(this.pages)
        const components = Array.from(this.components)

        const taroFileTypeMap = Object
          .entries(cls.getTaroFileTypeMap())
          .reduce((m, [k, v]: any[]) => {
            return {
              ...m,
              [k]: {
                ...v,
                importStyles: Array.from(v.importStyles || []),
              },
            }
          }, {})

        const pageConfigs = map2obj(this.pageConfigs)
        const pageComponentsDependenciesMap = map2obj((() => {
          const map = new Map()
          this.pageComponentsDependenciesMap.forEach((value: any,key: string) => {
            if (!value) return
            map.set(key, Array.from(value))
          })
          return map
        })())
        const addedComponents = Array.from(this.addedComponents)
        const json = {
          appConfig: this.appConfig,
          taroFileTypeMap,
          pages,
          components,
          pageConfigs,
          addedComponents,
          pageComponentsDependenciesMap,
        }
        await this.saveCache(json)
      }

      async run(compiler: webpack.Compiler) {
        console.time(chalk.green('MiniPlugin搜寻用时'))

        if (!this.usedCache) {
          this.usedCache = true
          const cache = await this.readCache()
          this.restoreFromCache(cache, compiler)
          if (cache) return
        }

        await super.run(compiler)

        console.timeEnd(chalk.green('MiniPlugin搜寻用时'))
        await this.saveCacheFromIns()
      }

      async watchRun(...args: any[]) {
        await super.watchRun(...args)
        await this.saveCacheFromIns()
      }

      async getComponents(...args: any[]) {
        // console.time('get Components')
        await super.getComponents(...args)
        // console.timeEnd('get Components')
      }
    }
}
