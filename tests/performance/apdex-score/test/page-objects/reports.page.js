const { $ } = require('@wdio/globals');
const Page = require('./page');

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    const page = settingsProvider.getPage('reports');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new ReportsPage();
