const Page = require('@page-objects/apdex/page');
const MESSAGE_LIST = 'messageList';

class MessagesPage extends Page {

  async loadMessageList(settingsProvider) {
    await super.loadPage(settingsProvider, MESSAGE_LIST);
  }

}

module.exports = new MessagesPage();
