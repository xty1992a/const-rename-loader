export type ConstModule = Map<
  string,
  {
    originCode: string; // 源码
    transCode: string; // 转换后的代码
    filePath: string; // 文件路径
    constMap: ConstMap;
  }
>;

export type ConstMap = Map<string, ConstItem>;

export type ConstItem = {
  originConstKey: string; // 源码中的key
  transConstKey: string; // 混淆后的key
};

export interface HandleExportOptions {
  resourcePath: string;
  code: string;
}

export interface HandleUseOptions extends HandleExportOptions {}

export interface File {
  code: string;
  sourcePath: string;
}
export type ExcludeFn = (file: File) => boolean;
export interface OptionalOption {
  exclude?: string[] | ExcludeFn;
}

export interface FakePluginOption {
  root: (path: string) => string;
}

export interface GetTaroAppConfig {
  appPath: string;
}

export interface Subpackage {
  root: string;
  pages: string[];
}
