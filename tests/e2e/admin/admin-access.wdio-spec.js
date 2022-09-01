const utils = require('../../utils');
const userFactory = require('../../factories/cht/users/users');
const loginPage = require('../../page-objects/login/login.wdio.page');
const common = require('../../page-objects/common/common.wdio.page');
const placeFactory = require('../../factories/cht/contacts/place');

const offlineUser = userFactory.build({ username: 'offlineuser', isOffline: true });
const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

const adminNavbarLogo = () => $('.navbar-header .navbar-brand');

describe('Acessing the admin app', () => {
  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');
  });

  it('should redirect to login when not logged in', async () => {
    await browser.url('/admin');
    await (await loginPage.loginButton()).waitForDisplayed();

    await browser.url('/admin/#/forms');
    await (await loginPage.loginButton()).waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    await (await loginPage.loginButton()).waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    await (await loginPage.loginButton()).waitForDisplayed();
  });

  it('should show access error when accessing as an offline user', async () => {
    const error = '{"code":403,"error":"forbidden","details":"Offline users are not allowed access to this endpoint"}';
    await utils.saveDocs([parent]);
    await utils.createUsers([offlineUser]);
    await loginPage.cookieLogin({ ...offlineUser, createUser: false });

    await common.waitForLoaders();
    await browser.url('/admin/#/forms');
    expect(await (await adminNavbarLogo()).isDisplayed()).to.equal(false);
    expect(await (await $('pre')).getText()).to.equal(error);

    await browser.url('/admin');
    expect(await (await adminNavbarLogo()).isDisplayed()).to.equal(false);
    expect(await (await $('pre')).getText()).to.equal(error);

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    expect(await (await adminNavbarLogo()).isDisplayed()).to.equal(false);
    expect(await (await $('pre')).getText()).to.equal(error);

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    expect(await (await adminNavbarLogo()).isDisplayed()).to.equal(false);
    expect(await (await $('pre')).getText()).to.equal(error);
  });

  it('should allow admins to access the page', async () => {
    await loginPage.cookieLogin({ ...auth, createUser: false });

    await browser.url('/admin');
    await (await adminNavbarLogo()).waitForDisplayed();
    expect(await (await adminNavbarLogo()).getText()).to.equal('App Management');

    await browser.url('/admin#/forms');
    await (await adminNavbarLogo()).waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/');
    await (await adminNavbarLogo()).waitForDisplayed();

    await browser.url('/medic/_design/medic-admin/_rewrite/#/authorization/permissions');
    await (await adminNavbarLogo()).waitForDisplayed();
  });
});
