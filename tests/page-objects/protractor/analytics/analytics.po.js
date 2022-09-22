const helper = require('../../../helper');


module.exports = {
  expectModulesToBeAvailable: async (modules) => {
    await helper.waitUntilReadyNative(element(by.css('.mm-navigation-menu')));
    for (const module of modules) {
      expect(await browser.isElementPresent(by.css(`.mm-navigation-menu li a[href="${module}"]`))).toBeTruthy();
    }
  },

  goToTargetAggregates: async (enabled) => {
    await helper.waitUntilReadyNative(element(by.css('.mm-navigation-menu')));
    await element(by.css(`.mm-navigation-menu li a[href="#/analytics/target-aggregates"]`)).click();
    if (enabled) {
      await helper.waitUntilReadyNative(element(by.css('#target-aggregates-list')));
    } else {
      await helper.waitUntilReadyNative(element(by.css('.page .item-content.disabled')));
    }
  },
  targetById: (id) => element(by.css(`div[test-target-id="${id}"]`)),
  targetNumber: (target) => target.element(by.css('.number')),
  targetGoal: (target) => target.element(by.css('.goal p')),
  targetTitle: (target) => target.element(by.css('.title h2')),

};
