const path = require('path');
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
  };
};
