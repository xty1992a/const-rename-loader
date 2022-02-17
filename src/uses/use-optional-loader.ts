import {transOptional, handleOptionalOption} from '../utils/trans-optional'
import * as types from '../type'

export const makeUseOptionalLoader = (transform: any, option: types.OptionalOption = {}) => {
  const excludeFn = handleOptionalOption(option)

  const oldFn = transform.default
  transform.default = (options: any) => {
    // 被排除的代码
    if (excludeFn({code: options.code, sourcePath: options.sourcePath})) {
      return oldFn(options)
    }

    try{
      // 将代码交由插件处理
      options.code = transOptional({source: options.code, sync: true})
    }catch (e) {
      console.log(e)
      console.log(options.code)
      console.log('transOptional 失败')
    }
    return oldFn(options)
  }
  return function useOptionalLoader(chain: any) {
    chain.module
      .rule('script')
      .use('optional-loaders')
      .loader('@redbuck/taro-compiler-helper/dist/loaders/optional-loaders.js')
      .options(option)
      .end()
  }
}
