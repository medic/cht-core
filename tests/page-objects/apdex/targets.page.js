const Page = require('@page-objects/apdex/page');

class TargetsPage extends Page {
  
  async loadTargets(settingsProvider) {
    const page = settingsProvider.getPage('targets');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

}

module.exports = new TargetsPage();
