const { browser, driver } = require('@wdio/globals');
const { execSync } = require('child_process');
const loadSettings = require('../../performance/apdex-score/settings-provider');
const APP_ID = 'org.medicmobile.webapp.mobile';

module.exports = class Page {

  async waitForDisplayedAndRetry(selector, retry = 20) {
    const TIME_OUT = 1000 * 60 * 20;
    try {
      return await (await $(selector)).waitForDisplayed({ timeout: TIME_OUT });
    } catch (error) {
      if (retry < 0) {
        console.error('Error: ', error);
        return false;
      }     
      await this.waitForDisplayedAndRetry(selector, --retry);
    }
  }

  async clickElement(selector) {
    if (await this.waitForDisplayedAndRetry(selector)) {
      await (await $(selector)).click();
    }
  }

  getSettingsProvider() {
    return loadSettings();
  }

  getButtonSelector(label) {
    return `//android.widget.Button[@text="${label}"]`;
  }

  clickButton(label) {
    return this.clickElement(this.getButtonSelector(label));
  }

  getLinkSelector(label) {
    return `//android.widget.TextView[@text="${label}"]`;
  }

  clickLink(label) {
    return this.clickElement(this.getLinkSelector(label));
  }

  isLinkExisting(label) {
    return $(this.getLinkSelector(label)).isExisting();
  }

  async setValue(selector, value) {
    // Empty strings or zeros are fine.
    if (value === undefined) {
      return;
    }

    if (await this.waitForDisplayedAndRetry(selector)) {
      await (await $(selector)).setValue(value);
    }
  }

  scrollToElement(context) {
    if (context.scrollDown) {
      this.scrollDown(context.scrollDown);
    }

    if (context.scrollUp) {
      this.scrollUp(context.scrollUp);
    }
  }

  scrollDown(swipes = 0) {
    for (let i = 0; i < swipes; i++) {
      execSync('adb shell input swipe 500 1000 300 300');
    }
  }

  scrollUp(swipes = 0) {
    for (let i = 0; i < swipes; i++) {
      execSync('adb shell input swipe 300 300 500 1000');
    }
  }

  async enterKeycodes(keycodes) {
    const WAIT_ANIMATION = 300;
    if (!keycodes?.length) {
      return;
    }

    if (!await driver.isKeyboardShown()) {
      await browser.pause(WAIT_ANIMATION);
    }

    for (const keycode of keycodes) {
      await driver.pressKeyCode(keycode);
    }

    await driver.hideKeyboard();
    if (await driver.isKeyboardShown()) {
      await browser.pause(WAIT_ANIMATION);
    }
  }

  async assertMany(asserts) {
    if (!asserts?.length) {
      return;
    }

    for (const assert of asserts) {
      this.scrollToElement(assert);
      await this.waitForDisplayedAndRetry(assert.selector);
    }
  }

  async navigate(navigation) {
    if (!navigation?.length) {
      return;
    }

    for (const navStep of navigation) {
      this.scrollToElement(navStep);
      await this.clickElement(navStep.selector);
      await this.assertMany(navStep.asserts);
    }
  }

  async loadAndAssertPage(page) {
    if (!page) {
      return;
    }

    const commonElements = this.getSettingsProvider().getCommonElements();
    if (page.relaunchApp) {
      await this.relaunchApp(commonElements);
    }

    await this.navigate(page.navigation, page.asserts);
    await this.navigate(page.postTestPath);
  }

  async enterFieldValue(field) {
    this.scrollToElement(field);

    await this.clickElement(field.selector);
    await this.enterKeycodes(field.keycodes);
    await this.setValue(field.selector, field.value);

    if (field.dropdownOption) {
      await this.clickElement(field.dropdownOption);
    }

    await this.assertMany(field.asserts);
  }

  async fillUpFormPage(formPage) {
    if (!formPage.fields) {
      return;
    }

    await this.assertMany(formPage.asserts);

    for (const field of formPage.fields) {
      await this.enterFieldValue(field);
    }

    this.scrollToElement(formPage);
  }

  async fillUpForm(form){
    if (!form) {
      return;
    }

    const commonElements = this.getSettingsProvider().getCommonElements();
    const FAB_SELECTOR = commonElements?.fab || '//android.widget.Button[not(@text="Actions menu")]';
    const FAB_LIST_TITLE = commonElements?.fabListTitle || this.getLinkSelector('New');
    const SUBMIT_BUTTON_LABEL = commonElements?.formSubmit || 'Submit';
    const NEXT_PAGE_BUTTON_LABEL = commonElements?.formNext || 'Next >';

    if (form.useFAB) {
      await this.clickElement(FAB_SELECTOR);
      await this.waitForDisplayedAndRetry(FAB_LIST_TITLE);
    }

    await this.navigate(form.navigation);

    for (let i = 0; i < form.pages?.length; i++) {
      const page = form.pages[i];

      if (i > 0) {
        await this.clickButton(NEXT_PAGE_BUTTON_LABEL);
      }

      await this.fillUpFormPage(page);
    }

    await this.clickButton(SUBMIT_BUTTON_LABEL);
    await this.assertMany(form.postSubmitAsserts);
    await this.navigate(form.postTestPath);
  }

  async relaunchApp(commonElements) {
    const UI_ELEMENT = commonElements?.relaunchAppAssert || this.getLinkSelector('People');
    await driver.execute('mobile: terminateApp', {appId: APP_ID});
    await driver.execute('mobile: activateApp', {appId: APP_ID});
    await this.waitForDisplayedAndRetry(UI_ELEMENT);
  }

  async search (page) {
    if (!page || !page.search) {
      return;
    }

    const commonElements = this.getSettingsProvider().getCommonElements();
    const SEARCH_ICON = commonElements?.searchIcon || this.getLinkSelector('');
    const SEARCH_INPUT = '//android.widget.EditText';

    await this.navigate(page.navigation);
    await this.clickElement(SEARCH_ICON);
    await this.waitForDisplayedAndRetry(SEARCH_INPUT);

    await this.enterFieldValue({
      value: page.search.value,
      selector: SEARCH_INPUT,
    });

    // Trigger search with Enter.
    await this.enterFieldValue({ keycodes: [ 66 ] });

    await this.assertMany(page.search.asserts);
    await this.navigate(page.search.postTestPath);
  }

  async toggleAirplaneMode(state) {
    driver
      .getNetworkConnection()
      .then(nConnect => {
        if (nConnect === 1 && state === 'off') {
          execSync('adb shell cmd connectivity airplane-mode disable', { stdio: 'inherit' });
          return;
        }

        if (nConnect === 6 && state === 'on') {
          execSync('adb shell cmd connectivity airplane-mode enable', { stdio: 'inherit' });
        }
      })
      .catch(error => console.error('Error: ', error));
  }

  async loadPage(pageName) {
    const page = this.getSettingsProvider().getPage(pageName);
    await this.loadAndAssertPage(page);
  }

  async loadForm(formName) {
    const form = this.getSettingsProvider().getForm(formName);
    await this.fillUpForm(form);
  }

  async searchPage(pageName) {
    const page = this.getSettingsProvider().getPage(pageName);
    await this.search(page);
  }

};
