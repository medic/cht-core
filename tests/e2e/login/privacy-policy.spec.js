const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po.js');
const privacyPolicyPage = require('../../page-objects/privacy-policy/privacy-policy.po');
const helper = require('../../helper');

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
    await utils.saveDocsNative([privacyPolicies, PARENT_PLACE]);
  });

  afterEach(async () => {
    await utils.revertDbNative(['privacy-policies', 'PARENT_PLACE']);
  });

  afterAll(async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await utils.revertDbNative();
  });

  describe('for an online user', () => {
    afterEach(async () => {
      await utils.deleteUsersNative([onlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      await utils.createUsersNative([onlineUser]);

      // After first login, check that privacy policy was prompted to user
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
      expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual('English Privacy Policy\nMore markup');

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await utils.resetBrowserNative();
      await commonElements.calmNative();
      await utils.closeTour();
      await helper.handleUpdateModalNative();

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
    afterEach(async () => {
      await utils.deleteUsersNative([offlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      const frenchPolicyText = 'Politique de confidentialité en Francais\nPlus de markup';
      await utils.createUsersNative([offlineUser]);

      // After first login in french, check that privacy policy was prompted to user
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('offline', password, false, 'fr');
      expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual(frenchPolicyText);

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await utils.resetBrowserNative();
      await commonElements.calmNative();
      await utils.closeTour();
      await helper.handleUpdateModalNative();

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
    });
  });
});
