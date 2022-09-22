const helper = require('../../../helper');

module.exports = {
  configurationSection: () => element(by.css('.content .configuration')),

  openEditSettings: async () => {
    await helper.waitUntilReadyNative(module.exports.configurationSection());
    const link = module.exports.configurationSection().all(by.css('.btn-link')).last();
    await link.click();
    // modals have an animation and the click might land somewhere else
    await browser.sleep(500);
  },

  getLanguageField: () => element(by.id('language')),
  getSubmitButton: () => element(by.css('.btn.submit.btn-primary:not(.ng-hide)')),
};
