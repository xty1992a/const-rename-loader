const webpack = require('webpack');
const config = require('./webpack.config');

webpack(config, (err, stat) => {
  console.log('done');
});
