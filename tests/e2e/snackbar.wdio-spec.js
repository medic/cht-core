const loginPage = require('../page-objects/login/login.wdio.page');
const commonPage = require('../page-objects/common/common.wdio.page');
const utils = require('../utils');

const district = {
  _id: 'fixture:district',
  type: 'district_hospital',
  name: 'District',
  place_id: 'district',
  reported_date: new Date().getTime(),
};

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:district',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

describe('Syncing snackbar', () => {
  before(async () => {
    await utils.saveDoc(district);
    await utils.createUsers([chw]);

    await loginPage.login(chw);
    await commonPage.waitForPageLoaded();
    await commonPage.closeTour();
  });

  it('should display the snackbar with the syncing messages and then hide it', async () => {
    await commonPage.openHamburgerMenu();
    await (await commonPage.syncButton()).click();
    const snack = await commonPage.snackbar();
    await snack.waitForDisplayed();
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'All reports synced');
    await browser.waitUntil(async () => await snack.isDisplayedInViewport() === false);
  });

  it('should display the snackbar with a clickable action', async () => {
    await browser.throttle('offline');
    await commonPage.openHamburgerMenu();
    await (await commonPage.syncButton()).click();
    const snack = await commonPage.snackbar();
    await snack.waitForDisplayed();
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'Sync failed. Unable to connect.');

    await browser.throttle('online');
    const retryButton = await commonPage.snackbarAction();
    await retryButton.waitForClickable();
    await retryButton.click();
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'All reports synced');
  });
});
