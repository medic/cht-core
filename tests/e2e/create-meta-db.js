const _ = require('lodash');
const auth = require('../auth')();
const helper = require('../helper');
const utils = require('../utils');
const usersPage = require('../page-objects/users/users.po.js');
const commonElements = require('../page-objects/common/common.po.js');
const loginPage = require('../page-objects/login/login.po.js');
const addUserModal = require('../page-objects/users/add-user-modal.po.js');
const constants = require('../constants');
const dbName = constants.DB_NAME;

const userName = 'fulltester' + new Date().getTime();
const fullName = 'Roger Milla';
const password = 'StrongP@ssword1';

const options = {
  auth: { username: userName, password },
  method: 'GET',
  userName: userName
};

describe('Create user meta db : ', () => {

  afterAll(done => {
    commonElements.goToLoginPage();
    loginPage.login(auth.username, auth.password);
    return Promise.all([
      utils.request(`/_users/org.couchdb.user:${userName}`)
        .then(doc => utils.request({
          path: `/_users/org.couchdb.user:${userName}?rev=${doc._rev}`,
          method: 'DELETE'
        })),
      utils.revertDb(),
      utils.request({
        path: `/${dbName}-user-${userName}-meta`,
        method: 'DELETE'
      })
    ])
      .then(() => done()).catch(done.fail);
  });

  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  it('should allow a new user to read/write from meta db', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm(userName, fullName, password);
    addUserModal.submit();
    helper.waitForAngularComplete();
    commonElements.goToLoginPage();
    loginPage.login(userName, password, false);
    commonElements.calm();
    helper.waitForAngularComplete();

    const doc = { _id: userName };
    const postData = doc;

    browser.wait(() => {
      return utils.requestOnTestMetaDb(_.defaults({
        method: 'POST',
        body: postData
      }, options));
    });

    browser.wait(() => {
      return utils.requestOnTestMetaDb(_.defaults({
        path: '/_changes'
      }, options)).then(response => {
        const changes = response.results;
        const ids = _.map(changes, 'id').sort();
        expect(ids[1]).toEqual(doc._id);
        return true;
      });
    });
  });

});
