let config = {},
    translations = {};

module.exports = {
  init: (sourceConfig, sourceTranslations) => {
    config = sourceConfig;
    translations = sourceTranslations;
  },

  get: key => config[key],
  getAll: () => config,
  getTranslations: () => translations
};
