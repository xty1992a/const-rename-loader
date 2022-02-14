import {handleExport} from '../../src/handle-export'
import  * as glob  from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import {execSync} from 'child_process'
const root = (_path: string) => path.resolve(__dirname,'../..', _path);
const tsList = glob.sync(root('test/resource/**/*.ts'))

async function run() {
  execSync(`rm -rf ${root('test/tmp')}`, {cwd: __dirname})
  const list =tsList.splice(0)
  while (list.length) {
    const resourcePath = list.shift()
    const label = resourcePath + '用时'
    if (!resourcePath) break
    console.time(label)
    const code = handleExport({code: '', resourcePath})
    console.timeEnd(label)
    const target = resourcePath.replace(root('test/resource'), root('test/tmp'))
    const dir = path.dirname(target)
    execSync(`mkdir -p ${dir}`, {cwd: __dirname})
    fs.writeFile(target, code, 'utf-8', (err) => {
      if (!err) return
      console.log('done')
    })
  }
}
run()
