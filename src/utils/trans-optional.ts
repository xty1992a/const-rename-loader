import * as babel from "@babel/core";
import * as types from "../type";
type Option = {source: string; sync: boolean}

const dftExclude: types.ExcludeFn = ({code, sourcePath}: types.File) => {
  if (!/\?\./.test(code)) return true
  if (!/\?\?/.test(code)) return true
  return /node_modules/.test(sourcePath)
}

export function handleOptionalOption({exclude}: types.OptionalOption) {
  let excludeFn: types.ExcludeFn
  if (!exclude) {
    return dftExclude
  }
  if (Array.isArray(exclude)) {
    excludeFn = ({sourcePath}) => {
      return exclude.includes(sourcePath)
    }
  } else {
    excludeFn = exclude
  }
  return excludeFn
}

export function transOptional({source, sync}:Option) {
  const args: [string, babel.TransformOptions] = [
    source,
    {
      plugins: [
        [
          require('@babel/plugin-proposal-optional-chaining')
        ],
        [
          require('@babel/plugin-proposal-nullish-coalescing-operator')
        ],
        [
          require('@babel/plugin-syntax-typescript'),
          {
            isTSX: true
          }
        ],
      ]
    },
  ]


  if (sync) {
    return babel.transformSync(...args)?.code ?? source
  } else {
    return new Promise(resolve => {
      babel.transform(...args, (err, result) => {
        if (err) return resolve(source)
        return result?.code ?? source
      })
    })
  }
}
