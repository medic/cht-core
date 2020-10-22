const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
  resolve: {
    alias: {
      'enketo-config': 'src/ts/enketo/config.json',
      'widgets': 'src/ts/enketo/widgets',
      './xpath-evaluator-binding': 'src/ts/enketo/OpenrosaXpathEvaluatorBinding',
      'extended-xpath': 'node_modules/openrosa-xpath-evaluator/src/extended-xpath',
      'openrosa-xpath-extensions': 'node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
      // translator for enketo's internal i18n
      'translator': 'src/ts/enketo/translator',
      // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream
      // https://github.com/enketo/enketo-core/issues/454
      '../../js/dropdown.jquery': 'node_modules/bootstrap/js/dropdown',
      'bikram-sambat': 'node_modules/bikram-sambat',
    }
  },
  plugins: [
    // by default, importing moment will include all languages
    // https://github.com/moment/moment/issues/2517
    // https://www.npmjs.com/package/moment-locales-webpack-plugin
    new MomentLocalesPlugin({
      localesToKeep: ['en', 'fr', 'es', 'bm', 'hi', 'id', 'ne', 'sw'],
    }),
  ]
};
