import * as types from './type'
// @ts-ignore
import incstr from 'incstr'
const constantMap = new Map<string, types.ConstModule>()

//# region helper

function dropNum(string: string) {
  return string.replace(/\d/g, '')
}
export function genName(ok: (name: string) => boolean, alphabet = dropNum(incstr.alphabet)) {
  if (!alphabet) return ''
  const genNextName = incstr.idGenerator({alphabet})
  let name = ''

  do{
    name = genNextName()
  }while (!ok(name))
  return name
}

//# endregion

export class ConstHandler {
  moduleName: string

  constructor(options: {moduleName: string}) {
    this.moduleName = options.moduleName
    if (!constantMap.get(this.moduleName)) {
      constantMap.set(this.moduleName, new Map())
    }
  }

  get constant(): Map<string, string> {
    return constantMap.get(this.moduleName) || new Map()
  }

  // 存一个名称 ins.set('MODULE_TYPE_TITLE') => 'a'
  set(name: string) {
    const module = this.constant
    const values: Record<string, number> = [...module.values()].reduce((map,k) => ({...map, [k]: 1}), Object.create(null))
    const newName = genName(char => values[char] === undefined)
    module.set(name, newName)
    return newName
  }

  // 取一个名称 ins.get('MODULE_TYPE_TITLE') => 'a'
  get(name: string) {
    const module = this.constant
    return module.get(name)
  }
}
