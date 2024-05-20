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

  async assertMany(asserts = []) {
    for (const assert of asserts) {
      if (assert.scrollDown) {
        this.scrollDown(assert.scrollDown);
      }

      if (assert.scrollUp) {
        this.scrollUp(assert.scrollUp);
      }

      await this.waitForDisplayedAndRetry(assert.selector);
    }
  }

  async navigate(navigation = []) {
    for (const navStep of navigation) {
      if (navStep.scrollDown) {
        this.scrollDown(navStep.scrollDown);
      }

      if (navStep.scrollUp) {
        this.scrollUp(navStep.scrollUp);
      }

      if (await this.waitForDisplayedAndRetry(navStep.selector)) {
        await (await $(navStep.selector)).click();
      }

      if (navStep.asserts) {
        await this.assertMany(navStep.asserts);
      }
    }
  }

  async loadAndAssertPage(page) {
    await this.navigate(page.navigation, page.asserts);
    if (page.postTestPath) {
      await this.navigate(page.postTestPath);
    }
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

  async relaunchApp () {
    await driver.execute('mobile: terminateApp', {appId: 'org.medicmobile.webapp.mobile'});
    await browser.pause(2000);
    await driver.execute('mobile: activateApp', {appId: 'org.medicmobile.webapp.mobile'});
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
