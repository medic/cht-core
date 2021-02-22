const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po.js');
const privacyPolicyPage = require('../../page-objects/privacy-policy/privacy-policy.po');

describe('Privacy policy', () => {
  const password = 'Sup3rSecret!';
  const PARENT_PLACE = {
    _id: 'PARENT_PLACE',
    type: 'district_hospital',
    name: 'PARENT_PLACE'
  };
  const offlineUser = {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'offline',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'Offline'
    },
    roles: ['district_admin']
  };
  const onlineUser = {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'online',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'Offline'
    },
    roles: ['national_admin']
  };

  const privacyPolicyInEnglish = `
    <div>
      <h1>English Privacy Policy</h1>
      <p>More markup</p>
    </div>
  `;

  const privacyPolicyInFrench = `
    <div>
      <h1>Politique de confidentialité en Francais</h1>
      <p>Plus de markup</p>
    </div>
  `;

  const privacyPolicies = {
    _id: 'privacy-policies',
    privacy_policies: {
      en: 'en.attachment',
      fr: 'fr.html',
    },
    _attachments: {
      'en.attachment': {
        content_type: 'text/html',
        data: Buffer.from(privacyPolicyInEnglish).toString('base64'),
      },
      'fr.html': {
        content_type: 'text/html',
        data: Buffer.from(privacyPolicyInFrench).toString('base64'),
      }
    }
  };

  beforeAll(async () => {
    await utils.saveDocs([privacyPolicies, PARENT_PLACE]);
  });

  afterEach(async () => {
    await utils.revertDb(['privacy-policies', 'PARENT_PLACE']);
  });

  afterAll(async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await utils.revertDb();
    await commonElements.calmNative();
  });

  describe('for an online user', () => {
    afterEach(async () => {
      await utils.deleteUsers([onlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      await utils.createUsers([onlineUser]);

      // After first login, check that privacy policy was prompted to user
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
      expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual('English Privacy Policy\nMore markup');

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await utils.closeTour();

      await utils.resetBrowser();
      await commonElements.calmNative();

      // Check display when loading privacy policy page
      expect(await privacyPolicyPage.getPrivacyPolicyFromPage()).toEqual('English Privacy Policy\nMore markup');

      // No privacy policy on 2nd login
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
      await commonElements.calmNative();

      // After login in french, check that privacy policy was prompted to user again
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password, false, 'fr');
      const contentFr = await privacyPolicyPage.getPrivacyPolicyFromOverlay();
      expect(contentFr).toEqual('Politique de confidentialité en Francais\nPlus de markup');
      await privacyPolicyPage.acceptPrivacyPolicy();
    });
  });

  describe('for a french offline user', () => {
    let passed = false;
    afterEach(async () => {
      if (!passed) {
        // I suspect this test is failing because of a conflict.
        const userDoc = await utils.requestOnTestDb('/org.couchdb.user:offline?conflicts=true');
        console.log('Check if the test failed because of a conflict on this doc:');
        console.log(JSON.stringify(userDoc, null, 2));
      }
      await utils.deleteUsers([offlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      const frenchPolicyText = 'Politique de confidentialité en Francais\nPlus de markup';
      await utils.createUsers([offlineUser]);

      // After first login in french, check that privacy policy was prompted to user
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('offline', password, false, 'fr');
      expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual(frenchPolicyText);

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await utils.closeTour();
      await commonElements.syncNative();

      await utils.resetBrowser();
      await commonElements.calmNative();

      // Check display when loading privacy policy page
      expect(await privacyPolicyPage.getPrivacyPolicyFromPage()).toEqual(frenchPolicyText);

      // Update privacy policies
      const newPolicyText = 'Cette text est totalement different c`est fois!';
      await privacyPolicyPage.updatePrivacyPolicy('privacy-policies', 'fr_attachment', newPolicyText);
      await commonElements.syncNative();
      await browser.driver.navigate().refresh();

      // Privacy policy updated
      expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual(newPolicyText);
      await privacyPolicyPage.acceptPrivacyPolicy();
      passed = true;
    });
  });
});
