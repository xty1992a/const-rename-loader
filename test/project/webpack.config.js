const path = require('path');
const fs = require('fs');
const isDev = process.argv[1].includes('webpack-dev-server');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// @ts-ignore
const root = (_path) => path.resolve(__dirname, _path);

const constantFiles = [
  root('src/const/color.ts')
];

module.exports = {
  context: root('.'),
  mode: isDev ? 'development' : 'production',
  stats: 'errors-only',
  entry: root('src/main.ts'),
  output: {
	path: root('dist'),
	filename: '[name].js',
  },
  resolve: {
	extensions: [
	  '.ts',
	  '.js'
	],
  },
  module: {
	rules: [
	  {
		test: /\.tsx?/,
		use: [
		  'ts-loaders',
		  /*  {
			  loaders: '@redbuck/const-rename-loaders/dist/loaders',
			  options: {
				constantFiles
			  }
			},*/
		]
	  }
	],
  },

  plugins: [
	  new BundleAnalyzerPlugin()
  ],

  devServer: {
	contentBase: root('dist'),
	port: 9000,
  },

};
