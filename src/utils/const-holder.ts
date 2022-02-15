import * as types from '../type'
// @ts-ignore
import incstr from 'incstr'
const constModuleMap: types.ConstModule = new Map()

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

export class ConstHolder {
  moduleName: string

  constructor(options: {filePath: string}) {
    this.moduleName = options.filePath
    if (!constModuleMap.get(this.moduleName)) {
      constModuleMap.set(this.moduleName, {
        filePath: options.filePath,
        originCode: '',
        transCode: '',
        constMap: new Map()
      })
    }
  }

  static create(filePath: string) {
    return new ConstHolder({filePath})
  }

  get module () {
    return constModuleMap.get(this.moduleName)
  }

  get constant(): types.ConstMap {
    return this.module?.constMap || new Map()
  }

  get transCode() {
    return this.module?.transCode ?? ''
  }

  get originCode() {
    return this.module?.originCode ?? ''
  }

  get transConstKeys() {
    return [...this.constant.values()].reduce((map,k) => ({...map, [k.transConstKey]: 1}), Object.create(null))
  }

  get originConstKeys() {
    return [...this.constant.keys()]
  }

  setOriginCode(code: string) {
    if (!this.module) return
    this.module.originCode = code
  }
  setTransCode(code: string) {
    if (!this.module) return
    this.module.transCode = code
  }

  // 存一个名称 ins.get('MODULE_TYPE_TITLE') => ConstItem
  setConst(name: string) {
    const module = this.constant
    const newName = genName(char => this.transConstKeys[char] === undefined)
    const item = {
      originConstKey: name,
      transConstKey: newName
    }
    module.set(name, item)
    return item
  }

  // 取一个名称 ins.get('MODULE_TYPE_TITLE') => ConstItem
  getConst(name: string) {
    const module = this.constant
    return module.get(name)
  }
}
