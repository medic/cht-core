const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  resolve: {
    alias: {
      'enketo-config': 'src/js/enketo/config.json',
      'widgets': 'src/js/enketo/widgets',
      './xpath-evaluator-binding': 'src/js/enketo/OpenrosaXpathEvaluatorBinding',
      'extended-xpath': 'node_modules/openrosa-xpath-evaluator/src/extended-xpath',
      'openrosa-xpath-extensions': 'node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
      // translator for enketo's internal i18n
      'translator': 'src/js/enketo/translator',
      // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream
      // https://github.com/enketo/enketo-core/issues/454
      '../../js/dropdown.jquery': 'node_modules/bootstrap/js/dropdown',
      'bikram-sambat': 'node_modules/bikram-sambat',
      'messageformat': 'node_modules/messageformat/index',
      'lodash/core': 'node_modules/lodash/core',
      'lodash/uniqBy': 'node_modules/lodash/uniqBy',
      'lodash/flatten': 'node_modules/lodash/flatten',
      'lodash/intersection': 'node_modules/lodash/intersection',
      'lodash/partial': 'node_modules/lodash/partial',
      'lodash/uniq': 'node_modules/lodash/uniq',

      // enketo geopicker widget css requires these two images as backgrounds
      // they don't exist in the enketo source and the styles are commented out in the latest version
      // https://github.com/enketo/enketo-core/blob/master/src/widget/geo/geopicker.scss#L1119
      // the builder throws an error if the paths are not resolved
      '../../../api/build/static/webapp/images/layers.png': 'src/img/layers.png',
      '../../../api/build/static/webapp/images/layers-2x.png': 'src/img/layers.png',
    },
    fallback: {
      path: false,
      fs: false,
    }
  },
  plugins: [
    // by default, importing moment will include all languages
    // https://github.com/moment/moment/issues/2517
    // https://www.npmjs.com/package/moment-locales-webpack-plugin
    new MomentLocalesPlugin({
      localesToKeep: ['en', 'fr', 'es', 'bm', 'hi', 'id', 'ne', 'sw'],
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: '../../../analyzer.report.html',
      openAnalyzer: false,
    }),
  ]
};
