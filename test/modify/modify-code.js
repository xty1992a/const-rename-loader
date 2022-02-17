const {ts, Project} = require('ts-morph');
const path = require('path');
const root = (_path) => path.resolve(__dirname, '../..', _path);

function run({root, constFiles}) {
  const dir = _path => path.resolve(root, _path);

  const project = new Project({
	compilerOptions: {
	  target: ts.ScriptTarget.ESNext
	},
	tsConfigFilePath: dir('tsconfig.json'),
	skipAddingFilesFromTsConfig: true
  });

  const isConstFile = file => constFiles.includes(file.getFilePath())

  const files = project.addSourceFilesAtPaths(dir('src/**/*.ts'));

  const consts = files.filter(it => isConstFile(it)).map(file => ({
	file,
	name: path.parse(file.getBaseName()).name
  }))
  const normal = files.filter(it => !isConstFile(it))

  function getImportIdentRef(identifier) {
	return identifier.findReferences()
		.reduce((acc, it) => [...acc, ...it.getReferences()], [])
		.filter(reference => !reference.isDefinition())
		.map(reference => reference.getNode())
  }

  for (const file of normal) {

	console.log('处理文件', file.getFilePath())

	file.getImportDeclarations()
		.forEach(it => {
		  const structure = it.getStructure();
		  if (structure.namespaceImport) {
			getImportIdentRef(it.getNamespaceImportOrThrow())
				.forEach(node => {
				  node.replaceWithText(`consts.${structure.namespaceImport}`);
				});
		  }
		  if (structure.namedImports.length) {
			const name = structure.moduleSpecifier.split('/').reverse()[0]
				it.getNamedImports()

				.forEach(nameImp => {
				   getImportIdentRef(nameImp.getNameNode())
					  .forEach(node => {
						node.replaceWithText(`consts.${name}.${node.getText()}`)
					  });
				});
		  }
		});
	console.log(file.getText());
  }
}

run({
  root: root('test/project'),
  constFiles: [
	root('test/project/src/const/color.ts')
  ]
});
