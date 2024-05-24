const { $ } = require('@wdio/globals');
const Page = require('./page');

class PerformancePage extends Page {
  
  async loadAnalytics(settingsProvider) {
    const page = settingsProvider.getPage('performance');
    await super.loadAndAssertPage(page);

    const commonElements = settingsProvider.getCommonElements();
    await super.relaunchApp(commonElements);
  }

}

module.exports = new PerformancePage();
