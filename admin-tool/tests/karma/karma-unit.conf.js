const path = require('path');
const webpack = require('webpack');
const baseConfig = require('./karma-unit.base.conf');

module.exports = function (config) {
  config.set({
    ...baseConfig,
    basePath: '../../',
    logLevel: config.LOG_INFO,
    coverageReporter: {
      ...baseConfig.coverageReporter,
      dir: path.join(__dirname, 'coverage')
    }
  });

  config.buildWebpack.webpackConfig.resolve.fallback = {
    path: false,
    fs: false,
    os: false,
    zlib: false,
    http: false,
    https: false,
  };

  const plugins = config.buildWebpack.webpackConfig.plugins;
  plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
    })
  );
};
