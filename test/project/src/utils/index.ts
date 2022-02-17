import * as pages from '../const/page'

export function echo(...args: any[]) {
  console.log(pages.PAGE_1, ...args)
}
