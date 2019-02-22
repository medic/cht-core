let config = {},
    translations = {};

module.exports = {
  init: (c, t) => {
    config = Object.assign({}, c);
    translations = Object.assign({}, t);
  },

  get: key => config[key],
  getAll: () => config,
  getTranslations: () => translations
};
