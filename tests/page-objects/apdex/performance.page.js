const Page = require('@page-objects/apdex/page');

class PerformancePage extends Page {
  
  async loadAnalytics(settingsProvider) {
    const page = settingsProvider.getPage('performance');
    await super.loadAndAssertPage(page);
    await super.relaunchApp(settingsProvider);
  }

}

module.exports = new PerformancePage();
