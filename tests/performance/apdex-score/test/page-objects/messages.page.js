const Page = require('./page');

class MessagesPage extends Page {

  async loadMessageList(settingsProvider) {
    const page = settingsProvider.getPage('messageList');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

}

module.exports = new MessagesPage();
