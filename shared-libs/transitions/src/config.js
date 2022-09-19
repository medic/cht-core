let config = {};
let translations = {};
let transitionsLib = {};
module.exports = {
  init: (sourceConfig, sourceTranslations, transitions) => {
    config = sourceConfig;
    translations = sourceTranslations;
    transitionsLib = transitions;
  },

  get: key => (key ? config[key] : config),
  getAll: () => config,
  getTranslations: () => translations,
  getTransitionsLib: () => transitionsLib,
};
