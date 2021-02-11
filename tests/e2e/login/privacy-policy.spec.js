const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po.js');
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

  const closeTourModal = async () => {
    await helper.waitElementToBeVisibleNative(element(by.css('.modal-dialog .modal-footer .btn')));
    await element(by.css('.modal-dialog .modal-footer .btn')).click();
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
      await helper.waitElementToPresentNative(element(by.css('#privacy-policy-wrapper')));
      let content = await helper.getTextFromElementNative(element(by.css('#privacy-policy-wrapper .html-content')));
      expect(content).toEqual('English Privacy Policy\nMore markup');

      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      await acceptButton.click();
      await commonElements.calmNative();
      await utils.resetBrowserNative();
      // After accepting, no privacy policy on next load
      await commonElements.calmNative();
      await closeTourModal();
      await helper.handleUpdateModalNative();

      // Check display when loading privacy policy page
      await browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy.configuration'));
      await helper.waitElementToBeVisibleNative(privacyPolicyContainer);
      content = await helper.getTextFromElementNative(privacyPolicyContainer);
      expect(content).toEqual('English Privacy Policy\nMore markup');

      // No privacy policy on 2nd login
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
      await commonElements.calmNative();

      // After login in french, check that privacy policy was prompted to user again
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password, false, 'fr');
      const contentFr = await helper.getTextFromElementNative(element(by.css('#privacy-policy-wrapper .html-content')));
      expect(contentFr).toEqual('Politique de confidentialité en Francais\nPlus de markup');
      await element(by.css('#privacy-policy-wrapper .btn')).click();
      await commonElements.calmNative();
    });
  });

  describe('for a french offline user', () => {
    afterEach(async () => {
      await utils.deleteUsersNative([offlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      await utils.createUsersNative([offlineUser]);

      // After first login in french, check that privacy policy was prompted to user
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('offline', password, false, 'fr');
      await helper.waitElementToPresentNative(element(by.css('#privacy-policy-wrapper')));
      const content = element(by.css('#privacy-policy-wrapper .html-content'));
      let contentText = await helper.getTextFromElementNative(content);
      expect(contentText).toEqual('Politique de confidentialité en Francais\nPlus de markup');

      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      await acceptButton.click();
      await commonElements.calmNative();
      await utils.resetBrowserNative();
      // After accepting, no privacy policy on next load
      await commonElements.calmNative();
      await closeTourModal();
      await helper.handleUpdateModalNative();

      // Check display when loading privacy policy page
      await browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy.configuration'));
      await helper.waitElementToBeVisibleNative(privacyPolicyContainer);
      contentText = await helper.getTextFromElementNative(privacyPolicyContainer);
      expect(contentText).toEqual('Politique de confidentialité en Francais\nPlus de markup');

      // Update privacy policies
      const policiesDoc = await utils.getDocNative('privacy-policies');
      const updatePrivacyPolicyInFrench = 'Cette text est totalement different c`est fois!';
      policiesDoc.privacy_policies.fr = 'new_attachment';
      policiesDoc._attachments.new_attachment = {
        content_type: 'text/html',
        data: Buffer.from(updatePrivacyPolicyInFrench).toString('base64'),
      };
      await utils.saveDocNative(policiesDoc);

      await commonElements.syncNative();
      await browser.driver.navigate().refresh();

      // Privacy policy updated
      const contentElement = element(by.css('#privacy-policy-wrapper .html-content'));
      const contentUpdated = await helper.getTextFromElementNative(contentElement);
      expect(contentUpdated).toEqual(updatePrivacyPolicyInFrench);
      await element(by.css('#privacy-policy-wrapper .btn')).click();
      await commonElements.calmNative();
    });
  });
});
