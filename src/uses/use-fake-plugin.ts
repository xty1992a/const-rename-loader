import { FakePluginFactory } from "../plugins";
import * as types from "../type";

export function useFakePlugin(MiniPlugin: any, option: types.FakePluginOption) {
  const old = MiniPlugin.default;

  MiniPlugin.default = FakePluginFactory(MiniPlugin.default, option);

  const release = () => {
    MiniPlugin.default = old;
  };
  return release;
}
