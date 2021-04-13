const fs = require('fs');
const os = require('os');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const fsUtils = require('../lib/sync-fs');
const { info, warn, error } = require('./log');

module.exports = (pathToProject, entry, baseEslintPath, options = {}) => {
  const baseEslintConfig = fsUtils.readJson(baseEslintPath);
  
  const directoryContainingEntry = path.dirname(entry);
  const libName = path.basename(directoryContainingEntry);
  info(`Packaging ${libName}`);

  const outputDirectoryPath = os.tmpdir();
  const outputFilename = `./${libName}.js`;

  const compiler = webpack([{
    mode: 'production',
    entry,
    output: {
      path: outputDirectoryPath,
      filename: outputFilename,
      libraryTarget: options.libraryTarget ? 'umd' : undefined,
      globalObject: options.libraryTarget,
    },
    optimization: {
      minimize: !!options.minifyScripts,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            warnings: false,
            output: {
              comments: false,
              quote_style: 1,
            },
          },
        }),
      ],
    },
    resolve: {
      alias: {
        'tasks.js': path.join(pathToProject, 'tasks.js'),
        'targets.js': path.join(pathToProject, 'targets.js'),
        'contact-summary.templated.js': path.join(pathToProject, 'contact-summary.templated.js'),
      },
    },
    resolveLoader: {
      modules: [
        path.join(__dirname, '../../node_modules'),
        'node_modules',
      ],
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'eslint-loader',
          exclude: /node_modules/,
          options: {
            baseConfig: baseEslintConfig,
            useEslintrc: true,

            // pack the library regardless of the eslint result
            failOnError: false,
            failOnWarning: false,
          },
        },
      ],
    },
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/), // Ignore all optional deps of moment.js
    ]
  }]);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        error(err.stack || err);
        if (err.details) {
          error(err.details);
        }
        
        return reject(err);
      }

      info(stats.toString());

      if (stats.hasErrors()) {
        const hasErrorsNotRelatedToLinting = stats.toJson().errors.some(err => !err.includes('(from ./node_modules/eslint-loader/index.js)'));
        const shouldHalt = options.haltOnLintMessage || hasErrorsNotRelatedToLinting;
        if (shouldHalt) {
          return reject(Error(`Webpack errors when building ${libName}`));
        } else {
          warn('Ignoring linting errors');
        }
      }

      if (stats.hasWarnings() && options.haltOnWebpackWarning) {
        return reject(Error(`Webpack warnings when building ${libName}`));
      }

      const outputPath = path.join(outputDirectoryPath, outputFilename);
      resolve(fs.readFileSync(outputPath).toString());
    });
  });
};
