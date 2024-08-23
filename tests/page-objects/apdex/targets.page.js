const Page = require('@page-objects/apdex/page');
const TARGETS = 'targets';

class TargetsPage extends Page {

  async loadTargets(settingsProvider) {
    await super.loadPage(settingsProvider, TARGETS);
  }

}

module.exports = new TargetsPage();
