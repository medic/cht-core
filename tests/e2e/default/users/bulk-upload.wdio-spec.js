const usersAdminPage = require('../../../page-objects/admin/user.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');

describe('Bulk User Creation ->', () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await browser.execute(function() {
      this.localStorage.setItem('isTestEnv', true);
    });
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openUploadUsersDialog();
  });

  afterEach(() => {
    browser.execute(function() {
      this.localStorage.removeItem('isTestEnv');
    });
  });
  
  it('should show an upload summary with a successful upload and a failed upload', async () => {
    const path = require('path');
    const filePath = path.join(__dirname, 'bulk-upload-test.csv');
    await usersAdminPage.inputUploadUsersFields(filePath);
    await usersAdminPage.uploadUsers();
    await usersAdminPage.waitForUploadSummary();
    const successfulUploads = await usersAdminPage.getSuccessfulyUploadedUsers();
    const previouslyUploadedUsers = await usersAdminPage.getPreviouslyUploadedUsers();
    const failedUploads = await usersAdminPage.getFailedUploadedUsers();

    expect(successfulUploads).to.equal('1');
    expect(previouslyUploadedUsers).to.equal('0');
    expect(failedUploads).to.equal('0');

    await usersAdminPage.backToUserList();
    await usersAdminPage.openUploadUsersDialog();
    await usersAdminPage.inputUploadUsersFields(filePath);
    await usersAdminPage.uploadUsers();
    await usersAdminPage.waitForUploadSummary();
    const successfulUploadsSecondTime = await usersAdminPage.getSuccessfulyUploadedUsers();
    const previouslyUploadedUsersSecondTime = await usersAdminPage.getPreviouslyUploadedUsers();
    const failedUploadsSecondTime = await usersAdminPage.getFailedUploadedUsers();

    // we should get an error when trying to import the same users again
    expect(successfulUploadsSecondTime).to.equal('0');
    expect(previouslyUploadedUsersSecondTime).to.equal('0');
    expect(failedUploadsSecondTime).to.equal('1');
  });

});
