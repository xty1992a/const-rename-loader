import webpack from 'webpack';
import {transOptional, handleOptionalOption} from '../utils/trans-optional'
import {getOptions} from 'loader-utils'

export default function transOptionalLoader(this: webpack.loader.LoaderContext, source: string) {
  const option = getOptions(this)
  const excludeFn = handleOptionalOption(option as any)

  if (excludeFn({code: source, sourcePath: this.resourcePath})) {
    return source
  }

  try{
    return transOptional({source, sync: true})
  }catch (e) {
    console.log('tans error')
    return source
  }
}
