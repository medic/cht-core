const Page = require('./page');

class TargetsPage extends Page {
  
  async loadTargets(settingsProvider) {
    const page = settingsProvider.getPage('targets');
    await super.loadAndAssertPage(page);

    const commonElements = settingsProvider.getCommonElements();
    await super.relaunchApp(commonElements);
  }

}

module.exports = new TargetsPage();
