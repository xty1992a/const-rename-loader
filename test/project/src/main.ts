import * as color from './const/color'
import {PAGE_1, PAGE_3} from './const/page'
import * as utils from './utils'
import get from 'lodash/get'
import {String} from 'lodash'

export type S = String

utils.echo(`${PAGE_1} color is ${color.BLUE}`)

console.log(get({}, 'a.b.c') )

function test(color: { red: string }) {
  console.log(color.red + PAGE_3)
}

function test2(PAGE_1: string) {
  console.log(color.BLUE + PAGE_1)
}
