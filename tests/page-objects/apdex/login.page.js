const Page = require('@page-objects/apdex/page');

class LoginPage extends Page {
  
  get inputUsername() {
    return $('//android.view.View[@text="User name"]//parent::android.view.View/android.widget.EditText');
  }

  get inputPassword() {
    return $('//*[@text="Password"]//parent::android.view.View/android.view.View/android.widget.EditText');
  }

  async login(userType, userRole) {
    await this.inputUsername.waitForDisplayed();

    const user = super.getSettingsProvider().getUser(userType, userRole);
    await this.inputUsername.setValue(user.username);
    await this.inputPassword.setValue(user.password);

    await super.clickButton('Login');

    if (super.getSettingsProvider().hasPrivacyPolicy()) {
      await super.clickButton('Accept');
    }
  }

}

module.exports = new LoginPage();
