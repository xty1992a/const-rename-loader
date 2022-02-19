import { MiniSplitChunksPlugin } from "../plugins";

export function useSplitCommonChunk(chain: any) {
  chain.plugin("splitCommonChunk").use(MiniSplitChunksPlugin).end();
}
