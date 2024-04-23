const { $ } = require('@wdio/globals');
const Page = require('./page');

class MessagesPage extends Page {
    
get listMessages () {
    return $('(//android.widget.ListView)[1]');
}

get iconBack () {
    return $('//*[@text="Back"]');
}

async viewAMessage () {
    await super.clickDisplayedElem(super.tabMessages);
    await super.clickDisplayedElem(this.listMessages);
    await this.iconBack.click();
}

}

module.exports = new MessagesPage();
