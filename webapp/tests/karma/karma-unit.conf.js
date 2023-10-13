// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
const path = require('path');
const baseConfig = require('./karma-unit.base.conf');

module.exports = function (config) {
  config.set(
    Object.assign(
      {},
      baseConfig,
      {
        basePath: '../../',
        logLevel: config.LOG_INFO,
        coverageReporter: Object.assign(
          {},
          baseConfig.coverageReporter,
          { dir: path.join(__dirname, 'coverage') }
        )
      }
    ),
  );

  // allow to require xml files as strings
  config.buildWebpack.webpackConfig.module.rules.push({
    test: /enketo-xml\/.*\.xml$/i,
    use: 'raw-loader',
  });

  config.buildWebpack.webpackConfig.resolve.fallback = {
    path: false,
    fs: false,
  };
};
