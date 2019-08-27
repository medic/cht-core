const _ = require('underscore'),
      auth = require('../auth')(),
      helper = require('../helper'),
      utils = require('../utils'),
      usersPage = require('../page-objects/users/users.po.js'),
      commonElements = require('../page-objects/common/common.po.js'),
      loginPage = require('../page-objects/login/login.po.js'),
      addUserModal = require('../page-objects/users/add-user-modal.po.js'),
      constants = require('../constants'),
      dbName = constants.DB_NAME;

const userName = 'fulltester' + new Date().getTime(),
      fullName = 'Roger Milla',
      password = 'StrongP@ssword1';

const options = {
  auth: `${userName}:${password}`,
  method: 'GET',
  userName: userName
};

describe('Create user meta db : ', () => {

  afterAll(done => {
    commonElements.goToLoginPage();
    loginPage.login(auth.user, auth.pass);
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
    const postData = JSON.stringify(doc);

    browser.wait(() => {
      return utils.requestOnTestMetaDb(_.defaults({ 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
        },
        body: postData
      }, options));
    });

    browser.wait(() => {
      return utils.requestOnTestMetaDb(_.defaults({ 
        path: '/_changes' 
      }, options)).then(response => {
        const changes = response.results;
        const ids = _.pluck(changes, 'id').sort();
        expect(ids[1]).toEqual(doc._id);
        return true;
      });
    });
  });

});