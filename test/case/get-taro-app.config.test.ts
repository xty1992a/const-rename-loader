import { getTaroAppConfig } from "../../src/utils";
import * as path from "path";
import * as fs from "fs";

const root = (_path: string) => path.resolve(__dirname, "../..", _path);

const config_path = root("test/resource/taro/config.json");
const app_path = root("test/resource/taro/app.tsx");
const config = JSON.parse(fs.readFileSync(config_path, "utf-8"));

const json = getTaroAppConfig({
  appPath: app_path,
});

console.log(JSON.stringify(json) === JSON.stringify(config));
