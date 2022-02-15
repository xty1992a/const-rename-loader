import * as color from './const/color'
import {PAGE_1, PAGE_3} from './const/page'

console.log(`${PAGE_1} color is ${color.BLUE}`)

function test(color: { red: string }) {
  console.log(color.red + PAGE_3)
}

function test2(PAGE_1: string) {
  console.log(color.BLUE + PAGE_1)
}
