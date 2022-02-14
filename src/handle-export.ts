import * as types from './type';
import {Project, ts, Node, SyntaxKind, VariableDeclaration} from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs'
import {ConstHandler} from './utils'

const map = new Map<string, { code: string, resourcePath: string }>();
const rdm = () =>  Math.random().toString(36).substr(2, 15);

const dir = (_path: string) => path.resolve(__dirname, _path);

export function handleExport({resourcePath}: types.HandleExportOptions) {
  const handler = new ConstHandler({moduleName: resourcePath})
  const project = new Project({compilerOptions: {target: ts.ScriptTarget.ESNext}});
  const code = fs.readFileSync(resourcePath, 'utf-8');
  const file = project.createSourceFile('1.ts', code);

  const exportList = file.getExportedDeclarations();

  for (const [name, decs] of exportList) {
    decs.forEach((it) => {
      if (it.getKindName() !== 'VariableDeclaration') return;
      const name = (it as VariableDeclaration).getName();
      const newName = handler.set(name);
      ;(it as VariableDeclaration).set({name: newName});
    });
  }

  const result = project.emitToMemory();

  const [text] = result.getFiles();

  return text?.text || code;
}
