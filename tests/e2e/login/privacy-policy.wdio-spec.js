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
    username: 'offline',
    isOffline: true
  }),
  userFactory.build({
    username: 'online',
    roles: ['program_officer']
  })];

  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

  before(async () => {
    await utils.saveDocs([parent, privacyPolicy]);
  });

  users.forEach((user) => {
    describe(`for a ${user.username} user`, () => {
      beforeEach(async () => {
        await utils.createUsers([user]);
        await loginPage.login(user.username, user.password);
      });

      afterEach(async () => {
        await utils.deleteUsers([user]);
        await utils.deleteDocs([user.contact._id, user.place._id]);
        await browser.reloadSession();
        await browser.url('/');
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
          paragraph: 'This is a new privacy policy'
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
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), updated.text);
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });
    });
  });
});
