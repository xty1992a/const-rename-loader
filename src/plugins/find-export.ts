import * as  ts from 'typescript';

const rawCode = `export const RED = 'red'
export const BLUE = 'blue'
export const GREEN = 'green'
export const ORANGE = 'orange'
export const WHITE = 'white'
export const BLACK = 'black'`.trim()

console.time('start')


const file = ts.createSourceFile('1.ts', rawCode, ts.ScriptTarget.ESNext, true)
function printAllChildren(node: ts.Node, depth = 0) {
  console.log(new Array(depth + 1).join('----'), ts.SyntaxKind[node.kind], node.pos, node.end);
  depth++;
  node.getChildren().forEach(c => printAllChildren(c, depth));
}

printAllChildren(file)


console.timeEnd('start')

