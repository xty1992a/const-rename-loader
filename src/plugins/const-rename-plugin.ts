import {Project, ts, VariableDeclaration} from 'ts-morph';
import {ConstHolder} from '../utils'
import * as fs from 'fs'
import webpack from "webpack";
import {execSync} from 'child_process'
import {inspect} from 'util'

export interface Options {
  files: string[]
}

function modifyCode({code, filePath}: {code: string, filePath: string}) {
  console.time('new Project')
  const project = new Project({compilerOptions: {target: ts.ScriptTarget.ESNext}})
  console.timeEnd('new Project')

  console.time('createSourceFile')
  const file = project.createSourceFile('1.ts', code)
  console.timeEnd('createSourceFile')
  const holder = new ConstHolder({filePath})

  console.time('getExportedDeclarations')
  const exportList = file.getExportedDeclarations()
  console.timeEnd('getExportedDeclarations')

  for (const [name, decs] of exportList) {
    decs.forEach((it) => {
      if (it.getKindName() !== 'VariableDeclaration') return;
      const name = (it as VariableDeclaration).getName();
      const {transConstKey} = holder.setConst(name);
      ;(it as VariableDeclaration).set({name: transConstKey});
    });
  }

  console.time('emitToMemory')
  const result = project.emitToMemory();

  console.timeEnd('emitToMemory')

  console.time('getFiles')
  const [text] = result.getFiles();
  console.timeEnd('getFiles')

  const transCode = text?.text || code
  holder.setOriginCode(code)
  holder.setTransCode(transCode)

  return {
    code: transCode,
    constant: holder.constant
  }

}

export class ModifyConstPlugin {
  static PLUGIN_NAME = 'ModifyConstPlugin'
  files: string[]
  fileMap: Map<string, ReturnType<typeof modifyCode>> = new Map()

  constructor(props: Options) {
    console.log('创建ModifyConstPlugin')
    this.files = props.files
  }

  async updateExport(files: string[]) {
    console.time('updateExport')
    for (const filePath of files) {
      if (!filePath) continue
      const code = await fs.promises.readFile(filePath, 'utf-8')
      const result = modifyCode({code, filePath})
      this.fileMap.set(filePath, result)
    }
    console.timeEnd('updateExport')
  }

  getChangedFiles(compiler: webpack.Compiler) {
    // @ts-ignore
    const { watchFileSystem } = compiler;
    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;
    return Object.keys(watcher.mtimes)
      .filter(file => this.files.includes(file))
  }

  async modifyExport(fileList: string[], compilation: webpack.compilation.Compilation) {
    for (const filePath of fileList) {
      console.log('处理导出代码', filePath)
      const asset = compilation.assets[filePath]
      console.log(Object.keys(compilation.assets))

      if (!asset) continue
      const code = asset.source()
      const result = modifyCode({filePath, code})
      console.log('修改代码前', code)
      console.log('修改代码后',  result.code)
      compilation.assets[filePath] = {
        source: () => {
          return result.code
        },
        size: () => {
          return Buffer.byteLength(result.code, 'utf8');
        }
      }
    }
  }

  async modifyImport(fileList: string[], compilation: webpack.compilation.Compilation) {
    for (const filePath of fileList) {
      console.log('处理使用变量的代码', filePath)
    }
  }

  apply(compiler: webpack.Compiler) {
    console.log('apply----->')


    compiler.hooks.thisCompilation.tap(ModifyConstPlugin.PLUGIN_NAME, async (compilation,callback) => {
      console.log('on run')
    })

/*    compiler.hooks.beforeCompile.tapAsync(ModifyConstPlugin.PLUGIN_NAME, async (params, callback) => {
      console.log(params)
      await this.updateExport(this.files)
      callback()
    })*/

 /*   compiler.hooks.emit.tapAsync(ModifyConstPlugin.PLUGIN_NAME, async (compilation, callback) => {
      console.log('on emit --------->')

      let deps: string[] = []
      let exps: string[] = [...this.files]
      compilation.chunks.forEach((chunk) => {
        for(const module of chunk.modulesIterable) {
          module.dependencies.forEach((dep: any) => {
            if (!this.files.includes(dep?.module?.resource)) return;
            deps.push(module.resource)
          })
          // execSync(`echo "${inspect(module, {depth: 3}).replace(/"/g, '')}" > 1.json`, {cwd: __dirname})
        }
      })

      const files = [...compilation.fileDependencies]

      deps = deps.reduce((acc: string[], k) => files.includes(k) ? [...acc, k] : acc, [])
      exps = exps.reduce((acc: string[], k) => files.includes(k) ? [...acc, k] : acc, [])

      await this.modifyExport(exps, compilation)
      await this.modifyImport(deps, compilation)

      console.log('done')

      // execSync(`echo "${inspect(deps, {depth: 3}).replace(/"/g, '')}" > 1.json`, {cwd: __dirname})
      callback()
    })*/

  /*  compiler.hooks.run.tapAsync(ModifyConstPlugin.PLUGIN_NAME,async (compiler, callback) => {
      console.log('on Run，更新常量表', this.files)
      await this.updateExport(this.files)
      callback()
    })

    compiler.hooks.watchRun.tapAsync(ModifyConstPlugin.PLUGIN_NAME, async (compiler, callback) => {
      const files = this.getChangedFiles(compiler)
      if (files.length) {
        console.log('update export', files)
        await this.updateExport(files)
      }
      callback()
    })*/
  }
}
