const Page = require('./page');

class MessagesPage extends Page {

  async loadMessageList(settingsProvider) {
    const page = settingsProvider.getPage('messageList');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new MessagesPage();
