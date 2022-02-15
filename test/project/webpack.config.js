const path = require('path');
const fs = require('fs');
const isDev = process.argv[1].includes('webpack-dev-server')

// @ts-ignore
const {ModifyConstPlugin} = require('@redbuck/const-rename-loader/dist');
const root = (_path) => path.resolve(__dirname, _path);

const constantFiles = [
  root('src/const/color.ts')
]

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
            'ts-loader',
		/*  {
			loader: '@redbuck/const-rename-loader/dist/loader',
			options: {
			  constantFiles
			}
		  },*/
        ]
      }
    ],
  },

  plugins: [
    new ModifyConstPlugin({
      files: constantFiles
    })
  ],

  devServer: {
    contentBase: root('dist'),
    port: 9000,
  },

}
