const { browser, driver, $ } = require('@wdio/globals');
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

  async loadAndAssertPage(page) {
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
    const FAB_SELECTOR = commonElements?.fab || '//android.widget.Button[not(@text="Actions menu")]';
    const FAB_LIST_TITLE = commonElements?.fabListTitle || '//android.widget.TextView[@text="New"]';
    const FORM_SUBMIT_SELECTOR = commonElements?.formSubmit || '//android.widget.Button[@text="Submit"]';
    const FORM_PAGE_NEXT_SELECTOR = commonElements?.formNext || '//android.widget.Button[@text="Next >"]';

    await this.clickElement(FAB_SELECTOR);
    await this.waitForDisplayedAndRetry(FAB_LIST_TITLE);
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

  async relaunchApp (commonElements) {
    const MENU_LIST_TITLE = commonElements?.menuListTitle || '//*[@text="People"]';
    await driver.execute('mobile: terminateApp', {appId: 'org.medicmobile.webapp.mobile'});
    await driver.execute('mobile: activateApp', {appId: 'org.medicmobile.webapp.mobile'});
    await this.waitForDisplayedAndRetry(MENU_LIST_TITLE);
  }

  async searchContact(form) {
    const page = form.pages[0];

    await this.navigate(form.navigation);
    await this.fillUpFormPage(page);
    await this.assertMany(form.postSubmitAsserts);

    await this.navigate(form.postTestPath);
    await this.assertMany(form.postSubmitAssert);
  }

  async fillUpFormOnly(form, commonElements) {
    const FORM_SUBMIT_SELECTOR = commonElements?.formSubmit || '//android.widget.Button[@text="Submit"]';
    const FORM_PAGE_NEXT_SELECTOR = commonElements?.formNext || '//android.widget.Button[@text="Next >"]';

    await this.navigate(form.navigation);
    for (let i = 0; i < form.pages?.length; i++) {
      const page = form.pages[i];

      if (i > 0) {
        await this.clickElement(FORM_PAGE_NEXT_SELECTOR);
      }

      await this.fillUpFormPage(page);
    }

    await this.clickElement(FORM_SUBMIT_SELECTOR);
    await this.navigate(form.postTestPath);
    await this.assertMany(form.postSubmitAsserts);
  }

  // ToDo: clean all these below after settings are done

  get btnCustom() {
    return $('//*[@text="Custom"]');
  }

  get tabMessages() {
    return $('//*[@text="Messages"]');
  }

  get tabTasks() {
    return $('//*[@text="Tasks"]');
  }

  get tabReports() {
    return $('//*[@text="Reports"]');
  }

  get tabPeople() {
    return $('//*[@text="People"]');
  }

  get tabPerformance() {
    return $('//*[@text="Performance"]');
  }

  get tabVHTSummary() {
    return $('//*[contains(@text, "Summary")]');
  }

  get tabAnalytics() {
    return $('//*[contains(@text, "Analytics")]');
  }

  get tabDropdown() {
    return $('//android.view.View[@text=""]');
  }

  get menuItemSyncNow() {
    return $('//android.view.MenuItem[@text="Sync now"]');
  }

  get menuTextSyncStatus() {
    return $('(//*[@resource-id="header-dropdown"]//android.view.View)[2]');
  }

  get menuTextSyncTime() {
    return $('//android.view.View[contains(@text, "Last sync")]');
  }

  get menuItemAbout() {
    return $('//android.view.MenuItem[@text="About"]');
  }

  get menuItemSettings() {
    return $('//android.view.MenuItem[@text="User settings"]');
  }

  get menuItemReportBug() {
    return $('//android.view.MenuItem[@text="Report bug"]');
  }

  get scrollView () {
    return $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1)');
  }

  get scrollToEnd () {
    return $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(20)');
  }

  async scrollUntilTextVisible(text) {
    return $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${text}")`);
  }

  async clickDisplayedElem (elem) {
    await elem.waitForDisplayed();
    await elem.click();
  }

  async toggleAirplaneMode (state) {
    driver.getNetworkConnection().then(nConnect => {
      if (nConnect === 1 && state === 'off') {
        execSync('adb shell cmd connectivity airplane-mode disable', { stdio: 'inherit' });
      } else if (nConnect === 6 && state === 'on') {
        execSync('adb shell cmd connectivity airplane-mode enable', { stdio: 'inherit' });
      }
    })
      .catch(error => {
        console.error('Error: ', error);
      });
  }

  async syncData () {
    console.log(`TIME IS::: ${await driver.getDeviceTime()}`);
    //change date here - WIP
    await browser.pause(5000);
    await this.clickDisplayedElem(this.tabDropdown);
    await this.clickDisplayedElem(this.menuItemSyncNow);
    await browser.pause(1000);
    await this.tabDropdown.click();
  }

  // async extractCurrentDate(days) {
  //   const dateTimeString = await driver.getDeviceTime();
  //   let dateTime = moment(dateTimeString);
  //   dateTime = moment(dateTime).add(days, 'days');

  //   const year = dateTime.format('YY');
  //   const month = dateTime.format('MM');
  //   const day = dateTime.format('DD');
  //   const hour = dateTime.format('HH');
  //   const minute = dateTime.format('mm');

  //   return {year, month, day, hour, minute};
  // }

  // async updateCurrentDate (days) {
  //   const extractCurrentDate = await this.extractCurrentDate(days);
  //   console.log('TIME::: Year:', extractCurrentDate.year);
  //   console.log('TIME::: Month:', extractCurrentDate.month);
  //   console.log('TIME::: Day:', extractCurrentDate.day);
  //   console.log('TIME::: Hour:', extractCurrentDate.hour);
  //   console.log('TIME::: Minute:', extractCurrentDate.minute);
  //   console.log('TIME::: Extracted Components:', extractCurrentDate);
  //   const adbDateFormat = `${extractCurrentDate.month}${extractCurrentDate.day}${extractCurrentDate.hour}
  //   ${extractCurrentDate.minute}${extractCurrentDate.year}`;
  //   execSync('adb shell su root date ' + adbDateFormat, { stdio: 'inherit' });
  //   browser.pause(10000);
  // }

  // async getLmpDate () {
  //   const extractLmpDate = await this.extractCurrentDate(-62);
  //   const lmpDate = `20${extractLmpDate.year}-${extractLmpDate.month}-${extractLmpDate.day}`;
  //   return lmpDate;
  // }

  // async getFollowUpDate () {
  //   const extractNextDate = await this.extractCurrentDate(1);
  //   const followUpDate = `20${extractNextDate.year}-${extractNextDate.month}-${extractNextDate.day}`;
  //   return followUpDate;
  // }

  // async getVHTVisitDate () {
  //   const extractPreviousDate = await this.extractCurrentDate(-1);
  //   const visitDate = `20${extractPreviousDate.year}-${extractPreviousDate.month}-${extractPreviousDate.day}`;
  //   return visitDate;
  // }

};
