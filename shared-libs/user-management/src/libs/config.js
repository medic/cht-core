// let config = {};
// let translations = {};
//
// module.exports = {
//   init: (sourceConfig, sourceTranslations) => {
//     config = sourceConfig;
//     translations = sourceTranslations;
//   },
//
//   get: key => config[key],
//   getAll: () => config,
//   getTranslations: () => translations
// };
module.exports = {
  init: config => module.exports = config,
  get: () => {},
  getTransitionsLib: () => {}
};


