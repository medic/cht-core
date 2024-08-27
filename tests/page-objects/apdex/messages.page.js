const Page = require('@page-objects/apdex/page');
const MESSAGE_LIST = 'messageList';

class MessagesPage extends Page {

  async loadMessageList() {
    await super.loadPage(MESSAGE_LIST);
  }

}

module.exports = new MessagesPage();
