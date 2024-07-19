const Page = require('@page-objects/apdex/page');

class LoadPage extends Page {  
  
  get inputInstanceUrl() {
    return $('//android.widget.EditText[@resource-id="org.medicmobile.webapp.mobile:id/txtAppUrl"]');
  }

  get btnSave() {
    return $('//android.widget.Button[@resource-id="org.medicmobile.webapp.mobile:id/btnSaveSettings"]');
  }

  async loadInstance(url) {
    await super.toggleAirplaneMode('off');
    await super.getButton('Custom').click();
    await this.inputInstanceUrl.setValue(url);
    await this.btnSave.click();
  }

  async turnOnAirplaneMode(settingsProvider) {
    const commonElements = settingsProvider.getCommonElements();
    const UI_ELEMENT = commonElements?.relaunchAppAssert || '//*[@text="People"]';
    await this.waitForDisplayedAndRetry(UI_ELEMENT);
    await super.toggleAirplaneMode('on');
  }
  
}

module.exports = new LoadPage();