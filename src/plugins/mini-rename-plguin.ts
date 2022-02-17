 import webpack from 'webpack'
import * as fs from 'fs'
import * as path from 'path'
import {execSync} from 'child_process'

export class MiniRenamePlugin {
  apply(compiler: webpack.Compiler) {
    const dir = (_path: string) => path.resolve(compiler?.options?.output?.path ?? __dirname, _path)
    compiler.hooks.afterEmit.tap('MiniRenamePlugin', () => {
      try{
        const target = dir('project.config.json')
        const branch = `【${execSync('git branch --show-current').toString().replace('\n', '')}】`
        const json = JSON.parse(fs.readFileSync(target, 'utf-8'))

        const projectname = (json.projectname || '').replace(branch, '') + branch
        const newJson = {...json, projectname}
        fs.writeFileSync(target, JSON.stringify(newJson), 'utf-8')
      }catch (e) {
      }
    })
  }
}

