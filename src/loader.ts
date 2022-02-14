import { getOptions } from 'loader-utils';
import {validate} from 'schema-utils';
import webpack = require('webpack')
import {Schema} from "schema-utils/declarations/validate";
import {handleExport} from "./handle-export";

const schema: Schema = {
  "type": "object",
  "properties": {
    "constantFiles": {
      "type": "array",
      description: "需要处理的常量文件，绝对路径"
    }
  },
}

interface Options {
  constantFiles: string[]
}

export default function ConstRenameLoader(this: webpack.loader.LoaderContext, source: string) {
  const options = getOptions(this);
  validate(schema, options, {name: 'ConstRenameLoader'});
  const {constantFiles = []} = options as any

  if (constantFiles.includes(this.resourcePath)) return source


  return source
}

export function pitch(this: webpack.loader.LoaderContext, remain: any, pre:any, code: string) {
  const options = getOptions(this)
  validate(schema, options, {name: 'ConstRenameLoader'});

  const {resourcePath} = this
  const {constantFiles = []} = options as any

  if (!constantFiles.includes(resourcePath)) return

  return handleExport({
    code,
    resourcePath
  })
}
