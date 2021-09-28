const commonElements = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const privacyPolicyPage = require('../../page-objects/privacy-policy/privacy-policy.wdio.page');
const userFactory = require('../../factories/cht/users/users');
const privacyPolicyFactory = require('../../factories/cht/settings/privacy-policy');
const placeFactory = require('../../factories/cht/contacts/place');
const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();

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

  // const acceptance = {
  //   privacy_policy_acceptance_log: [
  //     {
  //       language: 'en',
  //       digest: privacyPolicy._attachments['en.attachment'].digest,
  //       accepted_at: Date.now()
  //     }
  //   ]
  // };

  const waitForPolicy = async (elm, { header, paragraph, language }) => {
    await browser.waitUntil(async () => {
      const wrapperText = await (elm).getText();
      return wrapperText.includes(header) && wrapperText.includes(paragraph);
    }, `Timed out waiting for ${language} Privacy Policy to Display`);
  };

  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

  before(async () => {
    await utils.saveDocs([parent, privacyPolicy]);
  });

  [onlineUser].forEach((user) => {
    describe(`for an ${user.username} user`, () => {
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
        // After first login, check that privacy policy was prompted to user
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), englishTexts);
      });

      // After accepting, no privacy policy on next load
      it('should not show on refresh', async () => {
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), englishTexts);
        await privacyPolicyPage.acceptPrivacyPolicy();
        await browser.url('/');
        await expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      // Check display when loading privacy policy page
      it('should display when navigating to the privacy policy page', async () => {
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), englishTexts);
        await privacyPolicyPage.acceptPrivacyPolicy();
        await (await commonElements.messagesTab()).waitForDisplayed();
        await privacyPolicyPage.goToPrivacyPolicyConfig();
        await waitForPolicy(await privacyPolicyPage.privacyConfig(), englishTexts);
      });

      // No privacy policy on 2nd login
      it('should not show on subsequent login', async () => {
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), englishTexts);
        await privacyPolicyPage.acceptPrivacyPolicy();
        await browser.reloadSession();
        await browser.url('/');
        await loginPage.login(onlineUser.username, onlineUser.password);
        await expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();
        await expect(await commonElements.messagesTab()).toBeDisplayed();
      });

      // After login in french, check that privacy policy was prompted to user again
      it('should show french policy', async () => {
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), englishTexts);
        await privacyPolicyPage.acceptPrivacyPolicy();
        await expect(await commonElements.messagesTab()).toBeDisplayed();
        await browser.reloadSession();
        await browser.url('/');
        await loginPage.login(onlineUser.username, onlineUser.password, 'fr');
        await waitForPolicy(await privacyPolicyPage.privacyWrapper(), frenchTexts);
        await privacyPolicyPage.acceptPrivacyPolicy();
      });
    });
  });

});




//   // WDIO currently cannot log in offline users because of service worker race condition
//   // https://github.com/medic/cht-core/issues/7242
//   xdescribe('for a french offline user', () => {
//     let passed = false;
//     afterEach(async () => {
//       if (!passed) {
//         // I suspect this test is failing because of a conflict.
//         const userDoc = await utils.requestOnTestDb('/org.couchdb.user:offline?conflicts=true');
//         console.log('Check if the test failed because of a conflict on this doc:');
//         console.log(JSON.stringify(userDoc, null, 2));
//       }
//     });

//     xit('should show the correct privacy policy on login', async () => {


//       // After accepting, no privacy policy on next load
//       await privacyPolicyPage.acceptPrivacyPolicy();
//       await commonElements.sync();

//       await browser.url('/');
//       await expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();

//       // Check display when loading privacy policy page
//       await privacyPolicyPage.goToPrivacyPolicyConfig();
//       await browser.waitUntil(async () => {
//         const wrapperText = await (await privacyPolicyPage.privacyConfig()).getText();
//         return wrapperText.includes(frenchTexts.header) && wrapperText.includes(frenchTexts.paragraph);
//       }, 'Timed out waiting for english online privacy to display');

//       // Update privacy policies
//       const newPolicyText = 'Cette text est totalement different c`est fois!';
//       await privacyPolicyPage.updatePrivacyPolicy('privacy-policies', 'fr', 'fr_attachment', newPolicyText);
//       await commonElements.sync();
//       await browser.refresh();

//       // Privacy policy updated
//       await browser.waitUntil(async () => {
//         const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
//         return wrapperText.includes(newPolicyText);
//       }, 'Timed out waiting for new offline french text');
//     });
//     passed = true;
//   });
// });
