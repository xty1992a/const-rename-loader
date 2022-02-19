/*
 * @Author: Curtis.Liong
 * @Date: 2021-07-07 21:22:17
 * @Last Modified by: Curtis.Liong
 * @Last Modified time: 2021-07-08 23:26:37
 *
 * 获取 app.tsx 的主包和分包配置
 */
const fs = require("fs");
const path = require("path");

const parse = require("@babel/parser").parse;
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;

module.exports = () => {
  const appConfigPath = path.resolve(__dirname, "..", "..", "src", "app.tsx");
  const appConfigFile = fs.readFileSync(appConfigPath, "utf-8");

  const appConfigAst = parse(appConfigFile, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "classProperties"],
  });

  let configAst;
  traverse(appConfigAst, {
    enter(path) {
      if (
        path.node.type === "ClassProperty" &&
        path.node.key.name === "config"
      ) {
        configAst = path.node.value;
      }
    },
  });

  const configJSON = generator(configAst).code;
  const { pages, subPackages } = new Function(`return ${configJSON}`)();
  return { pages, subPackages };
};
