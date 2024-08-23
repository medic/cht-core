const Page = require('@page-objects/apdex/page');
const CUSTOM_INSTANCE = 'Custom';

class LoadPage extends Page {  
  
  get inputInstanceUrl() {
    return $('//android.widget.EditText[@resource-id="org.medicmobile.webapp.mobile:id/txtAppUrl"]');
  }

  get btnSave() {
    return $('//android.widget.Button[@resource-id="org.medicmobile.webapp.mobile:id/btnSaveSettings"]');
  }

  async loadInstance(settingsProvider) {
    const isServerSettings = await super.isLinkExisting(CUSTOM_INSTANCE);
    // Check if the app has opened and the custom linktext is displayed before proceeding
    if (!isServerSettings) {
      return;
    }

    await super.toggleAirplaneMode('off');
    await super.clickLink(CUSTOM_INSTANCE);
    await this.inputInstanceUrl.setValue(settingsProvider.getInstanceURL());
    await this.btnSave.click();
  }

  async turnOnAirplaneMode(settingsProvider) {
    const commonElements = settingsProvider.getCommonElements();
    const UI_ELEMENT = commonElements?.relaunchAppAssert || super.getLinkSelector('People');
    await this.waitForDisplayedAndRetry(UI_ELEMENT);
    await super.toggleAirplaneMode('on');
  }
  
}

module.exports = new LoadPage();
