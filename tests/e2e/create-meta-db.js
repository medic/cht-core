const _ = require('lodash');
const utils = require('../utils');
const usersPage = require('../page-objects/users/users.wdio.page');
const commonElements = require('../page-objects/common/common.wdio.page');
const loginPage = require('../page-objects/login/login.wdio.page');
const addUserModal = require('../page-objects/users/add-user-modal.wdio.page');

const username = 'fulltester';
const fullName = 'Roger Milla';
const password = 'StrongP@ssword1';

const options = {
  auth: { username: username, password },
  method: 'GET',
  userName: username
};

describe('Create user meta db : ', () => {

  before(async () => await loginPage.cookieLogin());
  after(async () => await utils.deleteUsers([{ username: username }], true));

  it('should allow a new user to read/write from meta db', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm(username, fullName, password);
    await addUserModal.submit();
    await browser.url(utils.getBaseUrl() + 'messages');
    await commonElements.waitForPageLoaded();
    await commonElements.logout();
    await loginPage.login({ username, password });
    await commonElements.waitForPageLoaded();

    const doc = { _id: 'this is a random uuid' };
    await utils.requestOnTestMetaDb(_.defaults({ method: 'POST', body: doc }, options));

    const response = await utils.requestOnTestMetaDb(_.defaults({ path: '/_changes' }, options));

    const changes = response.results;
    const ids = changes.map(change => change.id).sort();
    expect(ids[1]).to.equal(doc._id);
  });

});
