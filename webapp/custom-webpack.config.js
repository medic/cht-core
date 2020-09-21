const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
  plugins: [
    // by default, importing moment will include all languages
    // https://github.com/moment/moment/issues/2517
    // https://www.npmjs.com/package/moment-locales-webpack-plugin
    new MomentLocalesPlugin({
      localesToKeep: ['en', 'fr', 'es', 'bm', 'hi', 'id', 'ne', 'sw'],
    }),
  ],
  node: {
    fs: "empty"
  }
};
