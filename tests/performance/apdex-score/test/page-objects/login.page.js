const { $ } = require('@wdio/globals');
const Page = require('./page');

class LoginPage extends Page {
  
  get inputUsername () {
    return $('//android.view.View[1]/android.widget.EditText');
  }

  get inputPassword () {
    return $('//android.view.View[3]/android.widget.EditText');
  }

  get btnLogin () {
    return $('//*[@text="Login"]');
  }

  get btnAccept () {
    return $('//*[@text="Accept"]');
  }

  async login (username, password, hasPrivacyPolicy) {
    await this.inputUsername.waitForDisplayed();
    await this.inputUsername.setValue(username);
    await this.inputPassword.setValue(password);
    await this.btnLogin.click();
    if (hasPrivacyPolicy) {
      await super.clickDisplayedElem(this.btnAccept);
    }
  }

}

module.exports = new LoginPage();
