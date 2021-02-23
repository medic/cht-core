const helper = require('../../helper');

module.exports = {
  configurationSection: () => element(by.css('.content .configuration')),

  openEditSettings: async () => {
    await helper.waitUntilReady(module.exports.configurationSection());
    const link = module.exports.configurationSection().all(by.css('.btn-link')).last();
    return link.click();
  },

  getLanguageField: () => element(by.id('language')),
  getSubmitButton: () => element(by.css('.btn.submit.btn-primary:not(.ng-hide)')),
};
