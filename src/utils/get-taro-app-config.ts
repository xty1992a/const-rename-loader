/*
 * @Author: Curtis.Liong
 * @Date: 2021-07-07 21:22:17
 * @Last Modified by: Curtis.Liong
 * @Last Modified time: 2021-07-08 23:26:37
 *
 * 获取 app.tsx 的主包和分包配置
 */

import * as fs from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";
import * as types from "../type";

export const getTaroAppConfig = (option: types.GetTaroAppConfig) => {
  const appConfigFile = fs.readFileSync(option.appPath, "utf-8");

  const appConfigAst = parse(appConfigFile, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "classProperties"],
  });

  const state: { node?: t.Node | null } = {};
  traverse(appConfigAst, {
    ClassProperty(path) {
      if ((path.node.key as t.Identifier)?.name !== "config") return;
      state.node = path.node.value;
    },
  });
  if (!state.node) return;
  const code = generator(state.node).code;
  return new Function(`return ${code}`).apply(undefined);
};
