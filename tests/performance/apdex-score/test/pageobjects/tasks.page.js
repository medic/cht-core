const { $ } = require('@wdio/globals');
const Page = require('./page');

class TasksPage extends Page {
    
  get iconCommodity () {
    return $('//*[@text="icon-commodity"]');
  }

  get iconPregnancy () {
    return $('//*[@text="icon-pregnancy"]');
  }
  get iconClose () {
    return $('//*[@text="Close"]');
  }

  get itemFirstTask () {
    return $('//*[contains(@text,"days left")]');
  }

  get itemRoyTask () {
    return $('//*[contains(@text,"Roy")]');
  }

  get itemDueTask () {
    return $('//*[contains(@text,"Due")]');
  }

  get itemFollowUpTask () {
    return $('(//*[contains(@text,"Follow-up")])[1]');
  }

  get btnYes () {
    return $('//android.widget.Button[@text="Yes"]');
  }

  get btnNext () {
    return $('//android.widget.Button[@text="Next >"]');
  }

  get btnExit () {
    return $('//android.widget.Button[@text="Exit"]');
  }

  async viewATask () {
    await super.clickDisplayedElem(super.tabTasks);
    await super.clickDisplayedElem(this.itemRoyTask);
    await browser.pause(2000);
    await this.iconClose.click();
    await this.itemRoyTask.waitForDisplayed();
  }

  async viewATaskNE () {
    await super.clickDisplayedElem(super.tabTasks);
    await super.clickDisplayedElem(this.iconPregnancy);
    await browser.pause(2000);
    await this.iconClose.click();
    await this.clickDisplayedElem(this.btnYes);
    await this.iconPregnancy.waitForDisplayed();
  }

  async viewATaskUG () {
    await super.clickDisplayedElem(super.tabTasks);
    await super.clickDisplayedElem(this.itemDueTask);
    await browser.pause(2000);
    await this.iconClose.click();
    await this.itemDueTask.waitForDisplayed();
  }

  async viewATaskTG () {
    await super.clickDisplayedElem(super.tabTasks);
    await super.clickDisplayedElem(this.itemFollowUpTask);
    await browser.pause(2000);
    await this.iconClose.click();
    await this.itemFollowUpTask.waitForDisplayed();
  }

  async viewATaskML () {
    await super.clickDisplayedElem(super.tabTasks);
    await super.clickDisplayedElem(this.iconPregnancy);
    await this.btnNext.waitForDisplayed();
    await browser.pause(2000);
    await this.iconClose.click();
    await this.clickDisplayedElem(this.btnExit);
    await this.iconPregnancy.waitForDisplayed();
  }

}

module.exports = new TasksPage();
