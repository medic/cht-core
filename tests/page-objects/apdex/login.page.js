const { $ } = require('@wdio/globals');
const Page = require('./page');

class LoginPage extends Page {
  
  get inputUsername() {
    return $('//android.view.View[@text="User name"]//parent::android.view.View/android.widget.EditText');
  }

  get inputPassword() {
    return $('//*[@text="Password"]//parent::android.view.View/android.view.View/android.widget.EditText');
  }

  async login(username, password, hasPrivacyPolicy) {
    await this.inputUsername.waitForDisplayed();
    await this.inputUsername.setValue(username);
    await this.inputPassword.setValue(password);
    await super.getButton('Login').click();
    if (hasPrivacyPolicy) {
      await super.clickDisplayedElem(super.getButton('Accept'));
    }
  }

}

module.exports = new LoginPage();
