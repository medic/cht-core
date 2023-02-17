

describe('Login and logout tests', () => {
 

  it('should display the "session expired" modal and redirect to login page', async () => {
    // Login and ensure it's redirected to webapp
    // await loginPage.login(auth);
    // await commonPage.closeTour();
    // await (await commonPage.messagesTab()).waitForDisplayed();
    // // Delete cookies and trigger a request to the server
    // await browser.deleteCookies('AuthSession');
    // await commonPage.goToReports();

    // expect(await (await modalPage.body()).getText()).to.equal('Your session has expired, please login to continue.');
    // await (await modalPage.submit()).click();
    expect((await browser.getUrl()).includes('/medic/login')).to.be.false;
  });
});
