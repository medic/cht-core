const _ = require('lodash');
const utils = require('../../../utils');
const usersPage = require('../../../page-objects/default/users/user.wdio.page');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

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
    await commonElements.goToMessages();
    await commonElements.logout();
    await loginPage.login({ username, password });
    await commonElements.waitForPageLoaded();

    const doc = { _id: 'this is a random uuid' };
    await utils.requestOnTestMetaDb(_.defaults({ method: 'POST', body: doc }, options));

    const response = await utils.requestOnTestMetaDb(_.defaults({ path: '/_changes' }, options));

    const changes = response.results;
    expect(changes.length).to.equal(2);
    const ids = changes.map(change => change.id).sort();
    expect(ids[0]).to.equal('_design/medic-user');
    expect(ids[1]).to.equal(doc._id);
  });

});
