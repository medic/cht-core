const { $ } = require('@wdio/globals');
const Page = require('./page');

class ReportsPage extends Page {
    
  get iconHealthCare () {
      return $('(//*[@text="icon-healthcare"])[1]');
  }

  get itemFirstReport () {
      return $('((//android.widget.ListView//android.view.View)[1]//android.view.View)[1]');
  }

  get iconBack () {
      return $('//*[@text="Back"]');
  }

  async viewAReport () {
    await super.clickDisplayedElem(super.tabReports);
    await super.clickDisplayedElem(this.iconHealthCare);
    await this.iconBack.click();
    await this.iconHealthCare.waitForDisplayed();
  }

  async viewAReportNE () {
    await super.clickDisplayedElem(super.tabReports);
    await super.clickDisplayedElem(this.itemFirstReport);
    await this.iconBack.click();
    await this.itemFirstReport.waitForDisplayed();
  }

}

module.exports = new ReportsPage();
