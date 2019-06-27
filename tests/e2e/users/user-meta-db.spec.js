const _ = require('underscore'),
      utils = require('../../utils'),
      usersPage = require('../../page-objects/users/users.po.js'),
      commonElements = require('../../page-objects/common/common.po.js'),
      loginPage = require('../../page-objects/login/login.po.js'),
      addUserModal = require('../../page-objects/users/add-user-modal.po.js');

const userName = 'fulltester' + new Date().getTime(),
      fullName = 'Roger Milla',
      password = 'StrongP@ssword1';

const options = {
  auth: `${userName}:${password}`,
  method: 'GET',
  userName: userName
};

describe('Create user meta db : ', () => {

  afterAll(done =>
    utils.request(`/_users/${userName}`)
    .then(doc => utils.request({
      path: `/_users/${userName}?rev=${doc._rev}`,
      method: 'DELETE'
    }))
    .catch(() => {}) // If this fails we don't care
    .then(() => utils.afterEach(done)));

  it('should allow a new user to read/write from meta db', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm(userName, fullName, password);
    addUserModal.submit();
    browser.wait(() => {
      return element(by.css('#edit-user-profile')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 2000);
    commonElements.goToLoginPage();
    loginPage.login(userName, password, false);
    browser.wait(() => {
      return element(by.css('.btn.cancel')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 4000);
    const doc = { _id: userName };
    browser.sleep(2000).then(()=> {
      const postData = JSON.stringify(doc);
      return utils.requestOnTestMetaDb(_.defaults({ 
        path: '/', 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
        },
        body: postData
      }, options));
    });
    browser.sleep(1).then(()=> {
      return utils.requestOnTestMetaDb(_.defaults({ 
        path: '/_changes' 
      }, options)).then(response => {
        const changes = response.results;
        const ids = _.pluck(changes, 'id').sort();
        expect(ids[1]).toEqual(doc._id);
      });
    });
  });

});