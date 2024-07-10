const Page = require('./page');

class MessagesPage extends Page {

  async loadMessageList(settingsProvider) {
    const page = settingsProvider.getPage('message-list');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new MessagesPage();
