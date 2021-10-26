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

describe('Snackbar', () => {
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
    await (await commonPage.activeSnackbar()).waitForDisplayed();
    expect(await commonPage.snackbarMessage()).to.equal('Currently syncing…');
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'All reports synced');
    await (await commonPage.inactiveSnackbar()).waitForDisplayed({ timeout: 6000 });
  });

  it('should display the snackbar with a clickable action', async () => {
    await browser.throttle('offline');
    await commonPage.openHamburgerMenu();
    await (await commonPage.syncButton()).click();
    await (await commonPage.activeSnackbar()).waitForDisplayed();
    expect(await commonPage.snackbarMessage()).to.equal('Currently syncing…');
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'Sync failed. Unable to connect.');

    const retryButton = await commonPage.snackbarAction();
    await retryButton.click();
    await browser.waitUntil(async () => await commonPage.snackbarMessage() === 'Currently syncing…', { interval: 250 });
  });
});
