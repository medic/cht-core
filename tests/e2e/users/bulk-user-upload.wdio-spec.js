const usersAdminPage = require('../../page-objects/admin/user.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');

describe('Bulk User Creation ->', () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openUploadUsersDialog();
  });
  
  it('should show an upload summary with a failure', async () => {
    const path = require('path');
    const filePath = path.join(__dirname, 'bulk-upload-test.csv');
    await usersAdminPage.inputUploadUsersFields(filePath);
    await usersAdminPage.uploadUsers();
    await usersAdminPage.uploadSummary();
  });
});
