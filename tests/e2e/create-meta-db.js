const _ = require('lodash');
const auth = require('../auth')();
const utils = require('../utils');
const usersPage = require('../page-objects/users/users.po.js');
const commonElements = require('../page-objects/common/common.po.js');
const loginPage = require('../page-objects/login/login.po.js');
const addUserModal = require('../page-objects/users/add-user-modal.po.js');
const helper = require('../helper');

const userName = 'fulltester' + new Date().getTime();
const fullName = 'Roger Milla';
const password = 'StrongP@ssword1';

const options = {
  auth: { username: userName, password },
  method: 'GET',
  userName: userName
};

describe('Create user meta db : ', () => {

  afterAll(async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await utils.deleteUsers([{ username: userName }], true);
    await utils.revertDb();
    await commonElements.calmNative();
  });

  beforeEach(() => utils.beforeEach());
  afterEach(() => utils.afterEach());

  it('should allow a new user to read/write from meta db', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm(userName, fullName, password);
    await addUserModal.submit();

    await helper.waitForTextDisplayed(userName);
    await helper.waitForTextDisplayed(fullName);

    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(userName, password, false);
    await commonElements.calmNative();
    await utils.closeTour();

    const doc = { _id: 'this is a random uuid' };
    await utils.requestOnTestMetaDb(_.defaults({ method: 'POST', body: doc }, options));

    const response = await utils.requestOnTestMetaDb(_.defaults({ path: '/_changes' }, options));

    const changes = response.results;
    const ids = changes.map(change => change.id).sort();
    expect(ids[1]).toEqual(doc._id);
  });

});
