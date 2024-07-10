const { $ } = require('@wdio/globals');
const Page = require('./page');

class LoadPage extends Page {
   
  get inputInstanceUrl () {
    return $('//android.widget.EditText[@resource-id="org.medicmobile.webapp.mobile:id/txtAppUrl"]');
  }

  get btnSave () {
    return $('//android.widget.Button[@resource-id="org.medicmobile.webapp.mobile:id/btnSaveSettings"]');
  }

  async loadInstance (url) {
    const isServerSettings = await super.btnCustom.isExisting();
    if (!isServerSettings) {
      return;
    }
    await super.toggleAirplaneMode('off');
    await super.btnCustom.waitForDisplayed();
    await super.btnCustom.click();
    await this.inputInstanceUrl.setValue(url);
    await this.btnSave.click();
  }

}

module.exports = new LoadPage();
