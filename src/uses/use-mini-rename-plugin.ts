import {MiniRenamePlugin} from '../plugins'

export function useMiniRenamePlugin(chain: any) {
  chain.plugin('mini rename plugin')
    .use(MiniRenamePlugin)
    .end()
}
