const commonElements = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const privacyPolicyPage = require('../../page-objects/privacy-policy/privacy-policy.po');
const userFactory = require('../../factories/cht/users/users');
const privacyPolicyFactory = require('../../factories/cht/settings/privacy-policy');
const placeFactory = require('../../factories/cht/contacts/place');

describe('Privacy policy', () => {
  const englishTexts = privacyPolicyFactory.english;
  const frenchTexts = privacyPolicyFactory.french;
  const offlineUser = userFactory.build();
  const onlineUser = userFactory.build({
    username: 'online',
    roles: ['program_officer'],
    place: {
      _id: 'hc2',
      type: 'health_center',
      name: 'Health Center 2',
      parent: 'dist1'
    },
    contact: {
      _id: 'fixture:user:onlineuser',
      name: 'onlineuser'
    }
  });

  const parent = placeFactory.place().build({_id:'dist1',type:'district_hospital'});

  before(async () => {
    await utils.saveDocs([parent, privacyPolicyFactory.privacyPolicy().build()]);
    await utils.createUsers([ onlineUser, offlineUser]);
  });

  describe('for an online user', () => {
    it('should show the correct privacy policy on login', async () => {
      // After first login, check that privacy policy was prompted to user
      await loginPage.login(onlineUser.username, onlineUser.password);
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes(englishTexts.header) && wrapperText.includes(englishTexts.paragraph);
      }, 'Timed out waiting for English Online Privacy Policy to Display');

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await browser.url('/');
      expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();

      // Check display when loading privacy policy page
      await privacyPolicyPage.goToPrivacyPolicyConfig();
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyConfig()).getText();
        return wrapperText.includes(englishTexts.header) && wrapperText.includes(englishTexts.paragraph);
      }, 'Timed out waiting for english online privacy to display');

      // No privacy policy on 2nd login
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login(onlineUser.username, onlineUser.password);
      expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();


      // After login in french, check that privacy policy was prompted to user again
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login(onlineUser.username, onlineUser.password, 'fr');
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes(frenchTexts.header) && wrapperText.includes(frenchTexts.paragraph);
      }, 'Timed out waiting for french online privacy to display');
      await privacyPolicyPage.acceptPrivacyPolicy();
    });
  });


  // WDIO currently cannot log in offline users because of service worker race condition
  // https://github.com/medic/cht-core/issues/7242
  xdescribe('for a french offline user', () => {
    let passed = false;
    afterEach(async () => {
      if (!passed) {
        // I suspect this test is failing because of a conflict.
        const userDoc = await utils.requestOnTestDb('/org.couchdb.user:offline?conflicts=true');
        console.log('Check if the test failed because of a conflict on this doc:');
        console.log(JSON.stringify(userDoc, null, 2));
      }
    });

    xit('should show the correct privacy policy on login', async () => {
      // After first login in french, check that privacy policy was prompted to user
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login(offlineUser.username, offlineUser.password, 'fr');
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes(frenchTexts.header) && wrapperText.includes(frenchTexts.paragraph);
      }, 'Timed out waiting for french offline privacy to display');

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await commonElements.sync();

      await browser.reloadSession();
      await browser.url('/');
      expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();

      // Check display when loading privacy policy page
      await privacyPolicyPage.goToPrivacyPolicyConfig();
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyConfig()).getText();
        return wrapperText.includes(frenchTexts.header) && wrapperText.includes(frenchTexts.paragraph);
      }, 'Timed out waiting for english online privacy to display');

      // Update privacy policies
      const newPolicyText = 'Cette text est totalement different c`est fois!';
      await privacyPolicyPage.updatePrivacyPolicy('privacy-policies', 'fr_attachment', newPolicyText);
      await commonElements.sync();
      await browser.refresh();

      // Privacy policy updated
      await browser.waitUntil(async () => {
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes(newPolicyText);
      }, 'Timed out waiting for new offline french text');
    });
    passed = true;
  });
});
