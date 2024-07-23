const { browser, driver } = require('@wdio/globals');
const { execSync } = require('child_process');

module.exports = class Page {

  async waitForDisplayedAndRetry(selector, retryTotal = 20, retryCount = 0) {
    const TIME_OUT = 1000 * 60 * 20;
    try {
      return await (await $(selector)).waitForDisplayed({ timeout: TIME_OUT });
    } catch (error) {
      if (retryCount >= retryTotal) {
        console.error(`Element did not display after retrying ${retryTotal}.`, error);
        return false;
      }
      return await this.waitForDisplayedAndRetry(selector, retryTotal, retryCount + 1);
    }
  }

  async clickElement(selector) {
    if (await this.waitForDisplayedAndRetry(selector)) {
      await (await $(selector)).click();
    }
  }

  async clickButton(label) {
    await this.clickElement('//*[@text="' + label +'"]');
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

    let shown = await driver.isKeyboardShown();
    if (!shown) {
      await browser.pause(WAIT_ANIMATION);
    }

    for (const keycode of keycodes) {
      await driver.pressKeyCode(keycode);
    }

    await driver.hideKeyboard();
    shown = await driver.isKeyboardShown();
    if (shown) {
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

  async loadAndAssertPage(page, commonElements) {
    if (!page) {
      return;
    }

    if (page.relaunchApp) {
      await super.relaunchApp(commonElements);
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

  async fillUpForm(form, commonElements){
    if (!form) {
      return;
    }

    const FAB_SELECTOR = commonElements?.fab || '//android.widget.Button[not(@text="Actions menu")]';
    const FAB_LIST_TITLE = commonElements?.fabListTitle || '//android.widget.TextView[@text="New"]';
    const FORM_SUBMIT_SELECTOR = commonElements?.formSubmit || '//android.widget.Button[@text="Submit"]';
    const FORM_PAGE_NEXT_SELECTOR = commonElements?.formNext || '//android.widget.Button[@text="Next >"]';

    if (form.useFAB) {
      await this.clickElement(FAB_SELECTOR);
      await this.waitForDisplayedAndRetry(FAB_LIST_TITLE);
    }

    await this.navigate(form.navigation);

    for (let i = 0; i < form.pages?.length; i++) {
      const page = form.pages[i];

      if (i > 0) {
        await this.clickElement(FORM_PAGE_NEXT_SELECTOR);
      }

      await this.fillUpFormPage(page);
    }

    await this.clickElement(FORM_SUBMIT_SELECTOR);
    await this.assertMany(form.postSubmitAsserts);
    await this.navigate(form.postTestPath);
  }

  async relaunchApp(settingsProvider) {
    const commonElements = settingsProvider.getCommonElements();
    const UI_ELEMENT = commonElements?.relaunchAppAssert || '//*[@text="People"]';
    await driver.execute('mobile: terminateApp', {appId: 'org.medicmobile.webapp.mobile'});
    await driver.execute('mobile: activateApp', {appId: 'org.medicmobile.webapp.mobile'});
    await this.waitForDisplayedAndRetry(UI_ELEMENT);
  }

  async search (page, commonElements) {
    if (!page || !page.search) {
      return;
    }

    const SEARCH_ICON = commonElements?.searchIcon || '//android.widget.TextView[@text=""]';
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

};
