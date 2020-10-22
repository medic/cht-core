const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

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

      // enketo geopicker widget css requires these two images as backgrounds
      // they don't exist in the enketo source and the styles are commented out in the lastest version
      // https://github.com/enketo/enketo-core/blob/master/src/widget/geo/geopicker.scss#L1119
      // the builder throws an error if the paths are not resolved
      // TODO: I just copied and renamed a random PNG to see that this is working, ideally find the original image or
      // create a 1x1px white png to replace
      '../../../build/images/layers.png': 'src/img/layers.png',
      '../../../build/images/layers-2x.png': 'src/img/layers.png',
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
