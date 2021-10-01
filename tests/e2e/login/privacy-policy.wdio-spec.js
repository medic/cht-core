const commonElements = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const privacyPage = require('../../page-objects/privacy-policy/privacy-policy.wdio.page');
const userFactory = require('../../factories/cht/users/users');
const privacyPolicyFactory = require('../../factories/cht/settings/privacy-policy');
const placeFactory = require('../../factories/cht/contacts/place');
const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();

describe('Privacy policy', () => {
  const englishTexts = privacyPolicyFactory.english;
  const frenchTexts = privacyPolicyFactory.french;
  const users = [userFactory.build({
    username: 'offlineUser',
    isOffline: true
  }),
  userFactory.build({
    username: 'onlineUser',
    roles: ['program_officer']
  })];

  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

  users.forEach((user) => {
    xdescribe(`for a ${user.username} user`, () => {
      beforeEach(async () => {
        await browser.reloadSession();
        await browser.url('/');
        await utils.saveDocs([parent, privacyPolicy]);
        await utils.createUsers([user]);
        await loginPage.login(user.username, user.password);
      });

      afterEach(async () => {
        await utils.deleteUsers([user]);
        await utils.deleteDocs([user.contact._id, user.place._id, parent._id, privacyPolicy._id]);
      });

      it('should show the correct privacy policy on login', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      it('should not show on refresh', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await browser.url('/');
        await expect(await privacyPage.privacyWrapper()).not.toBeDisplayed();
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      it('should display when navigating to the privacy policy page', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await privacyPage.goToPrivacyPolicyConfig();
        await privacyPage.waitForPolicy(await privacyPage.privacyConfig(), englishTexts);
      });

      it('should not show on subsequent login', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await browser.reloadSession();
        await browser.url('/');
        await loginPage.login(user.username, user.password);
        await expect(await privacyPage.privacyWrapper()).not.toBeDisplayed();
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      it('should show french policy on secondary login', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await browser.reloadSession();
        await browser.url('/');
        await loginPage.login(user.username, user.password, 'fr');
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), frenchTexts);
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      it('should show if the user changes there language', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await browser.setCookies({ name: 'locale', value: 'fr' });
        await browser.refresh();
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), frenchTexts);
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      it('should show if the user policy changes', async () => {
        const text = {
          header: 'New privacy policy',
          paragraph: 'This is a new privacy policy',
          language: 'Enlgish Updated'
        };
        const updated = {
          key: 'en_attachment',
          text: privacyPolicyFactory.privacyPolicyHtml(text)
        };
        const updatedPolicy = privacyPolicyFactory.privacyPolicy().build(
          { privacy_policies: { en: updated.key } }, { attachments: [updated] });

        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        await privacyPage.updatePrivacyPolicy(updatedPolicy);
        if (user.isOffline) {
          await commonElements.sync();
        }
        await browser.refresh();
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), text);
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });
    });
  });

  describe('conflicts', () => {
    let passed = false;
    const conflictUser = userFactory.build({
      username: 'newoffline',
      known: false
    });
    before(async () => {
      await utils.saveDocs([parent, privacyPolicy]);
      await utils.createUsers([conflictUser]);
      await loginPage.login(conflictUser.username, conflictUser.password);
    });
    afterEach(async () => {
      if (!passed) {
        // I suspect this test is failing because of a conflict.
        const userDoc = await utils.requestOnTestDb('/org.couchdb.user:offline?conflicts=true');
        console.log('Check if the test failed because of a conflict on this doc:');
        console.log(JSON.stringify(userDoc, null, 2));
      }
      await utils.deleteUsers([conflictUser]);
    });
    it('should not fail due to document conflict for new offline user', async () => {
      await privacyPage.waitForPolicy(await privacyPage.privacyWrapper(), englishTexts);
      await privacyPage.acceptPrivacyPolicy();
      await commonElements.closeTour();
      await commonElements.sync();
      await expect(await commonElements.messagesTab()).toBeDisplayed();
      passed = true;
    });
  });
});
