const { $ } = require('@wdio/globals');
const Page = require('./page');

class PerformancePage extends Page {
    
get iconMenu () {
    return $('//*[@resource-id="header-dropdown-link"]');
}

async viewPerformance () {
    await super.clickDisplayedElem(super.tabPerformance);
    await browser.pause(5000);
}

async viewVHTSummary () {
    await super.clickDisplayedElem(super.tabVHTSummary);
    await browser.pause(5000);
}

async viewAnalytics () {
    await super.clickDisplayedElem(super.tabAnalytics);
    await browser.pause(5000);
}

async relaunchApp () {
    await super.relaunchApp();
    await browser.pause(10000);
}

}

module.exports = new PerformancePage();
