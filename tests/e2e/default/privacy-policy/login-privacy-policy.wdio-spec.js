const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page.js');
const privacyPolicyFactory = require('@factories/cht/settings/privacy-policy');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const loginPrivacyPolicyPage = require('@page-objects/default/privacy-policy/login-privacy-policy.wdio.page');

describe('Privacy Policy Navigation for Unauthenticated Users', () => {
  const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();

  afterEach(async () => {
    await utils.deleteAllDocs();
  });

  it('should not display privacy policy page when the privacy policy is not enabled', async () => {
    await commonPage.reloadSession();

    // Assert: privacy policy link is not available on the login page
    const privacyPolicyLink = await loginPage.privacyPolicyPageLink();
    expect(await privacyPolicyLink.isDisplayed()).to.equal(false);
  });

  it('should navigate back to the login page when using either back button', async () => {
    await utils.saveDocs([privacyPolicy]);
    await commonPage.reloadSession();

    // Navigate to privacy policy page
    await loginPage.goToPrivacyPolicyPage();
    const privacyContent = await loginPrivacyPolicyPage.privacyContent();
    expect(await privacyContent.isDisplayed()).to.equal(true);

    // Test navigation using both back buttons
    const testBackButton = async (backButtonType) => {
      let backButton;
    
      if (backButtonType === 'top') {
        backButton = await loginPrivacyPolicyPage.topBackButton();
      } else if (backButtonType === 'bottom') {
        await loginPrivacyPolicyPage.scrollToBottom();
        backButton = await loginPrivacyPolicyPage.bottomBackButton();
      }
    
      // Click the back button
      await loginPrivacyPolicyPage.goBackToLoginPage(backButton);
    
      // Assert: back button redirects to the login page
      expect((await browser.getUrl()).includes('/medic/login')).to.be.true;
    
      // Navigate back to the privacy policy page for the next iteration
      await loginPage.goToPrivacyPolicyPage();
    };

    // Run tests for both buttons
    await testBackButton('top');
    await testBackButton('bottom');
  });
});
