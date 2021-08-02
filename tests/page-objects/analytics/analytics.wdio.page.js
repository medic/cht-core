
const listModule = module => $(`.mm-navigation-menu li a[href="${module}"]`);
const aggregates = () => $(`.mm-navigation-menu li a[href="#/analytics/target-aggregates"]`);
const aggregateList = () => $('#target-aggregates-list');
const pageDisabled = () => $('.page .item-content.disabled');
const analytics = () => $$('ul.mm-navigation-menu li a span');

module.exports = {
  expectModulesToBeAvailable: async (modules) => {
    for (const module of modules) {
      expect (await (await listModule(module)).isExisting()).toBeTruthy();
    }
  },

  goToTargetAggregates: async (enabled) => {
    await (await aggregates()).click();
    if (enabled) {
      await (await aggregateList()).waitForDisplayed();
    } else {
      await (await pageDisabled()).waitForDisplayed();
    }
  },
  targetById: (id) => $(`div[test-target-id="${id}"]`),
  targetNumber: (target) => target.$('.number'),
  targetGoal: (target) => target.$('.goal p'),
  targetTitle: (target) => target.$('.title h2'),
  analytics
};
