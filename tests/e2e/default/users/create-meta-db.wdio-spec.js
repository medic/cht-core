const _ = require('lodash');
const utils = require('@utils');
const usersPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const uuid = require('uuid').v4;

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

  it('should allow a new user to read/write from meta db', async () => {
    await usersPage.goToAdminUser();
    await usersPage.openAddUserDialog();
    await usersPage.inputAddUserFields(username, fullName, 'program_officer', '', '', password);
    await usersPage.saveUser();
    await commonPage.goToMessages();
    await commonPage.logout();
    await loginPage.login({ username, password });
    await commonPage.waitForPageLoaded();
    await commonPage.goToReports();

    const doc = { _id: uuid() };
    await utils.requestOnTestMetaDb(_.defaults({ method: 'POST', body: doc }, options));

    const response = await utils.requestOnTestMetaDb(_.defaults({ path: '/_changes' }, options));

    const changes = response.results;
    const ids = changes.map(change => change.id);
    expect(ids).to.include.members(['_design/medic-user', doc._id]);

    // admins can also read and write from the users meta db
    const adminDoc = { _id: uuid() };
    await utils.requestOnTestMetaDb({ method: 'POST', body: adminDoc, userName: options.userName });
    const adminChanges = await utils.requestOnTestMetaDb({ path: '/_changes', userName: options.userName });
    const adminChangeIds = adminChanges.results.map(change => change.id);
    expect(adminChangeIds).to.include.members(['_design/medic-user', doc._id, adminDoc._id]);
  });
});
