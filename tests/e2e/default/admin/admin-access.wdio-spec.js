const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const adminPage = require('@page-objects/default/admin/admin.wdio.page');
const common = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');

describe('Acessing the admin app', () => {
  const offlineUser = userFactory.build({ username: 'offline-user-admin', isOffline: true });
  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

  afterEach(async () => {
    await common.reloadSession();
  });

  it('should redirect to login when not logged in', async () => {
    await browser.url('/admin');
    await loginPage.loginButton().waitForDisplayed();

    await browser.url('/admin/#/forms');
    await loginPage.loginButton().waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    await loginPage.loginButton().waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    await loginPage.loginButton().waitForDisplayed();
  });

  it('should show access error when accessing as an offline user', async () => {
    const error = '{"code":403,"error":"forbidden","details":"Offline users are not allowed access to this endpoint"}';
    await utils.saveDocs([parent]);
    await utils.createUsers([offlineUser]);
    await loginPage.cookieLogin({ ...offlineUser, createUser: false });

    await common.waitForLoaders();
    await browser.url('/admin/#/forms');
    expect(await adminPage.adminNavbarLogo().isDisplayed()).to.equal(false);
    expect(await common.getJsonErrorText()).to.equal(error);

    await browser.url('/admin');
    expect(await adminPage.adminNavbarLogo().isDisplayed()).to.equal(false);
    expect(await common.getJsonErrorText()).to.equal(error);

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    expect(await adminPage.adminNavbarLogo().isDisplayed()).to.equal(false);
    expect(await common.getJsonErrorText()).to.equal(error);

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    expect(await adminPage.adminNavbarLogo().isDisplayed()).to.equal(false);
    expect(await common.getJsonErrorText()).to.equal(error);
  });

  it('should allow admins to access the page', async () => {
    await loginPage.cookieLogin({ createUser: false });

    await browser.url('/admin');
    await adminPage.adminNavbarLogo().waitForDisplayed();
    expect(await adminPage.adminNavbarLogo().getText()).to.equal('App Management');

    await browser.url('/admin#/forms');
    await adminPage.adminNavbarLogo().waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    await adminPage.adminNavbarLogo().waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    await adminPage.adminNavbarLogo().waitForDisplayed();
  });
});
