const helper = require('../../helper');

module.exports = {
  expectModulesToBeAvailable: (modules) => {
    helper.waitUntilReady(element(by.css('.mm-navigation-menu')));
    modules.forEach(module => {
      expect(browser.isElementPresent(by.css(`.mm-navigation-menu li a[ui-sref="${module}"]`))).toBeTruthy();
    });
  },

  goToTargetAggregates: (enabled) => {
    helper.waitUntilReady(element(by.css('.mm-navigation-menu')));
    element(by.css(`.mm-navigation-menu li a[ui-sref="analytics.target-aggregates.detail"]`)).click();
    if (enabled) {
      helper.waitUntilReady(element(by.css('#target-aggregates-list')));
    } else {
      helper.waitUntilReady(element(by.css('.page .item-content.disabled')));
    }
  },
};
