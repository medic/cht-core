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
    await helper.waitElementToBeVisible(element(by.css('.modal-dialog .modal-footer .btn')));
    element(by.css('.modal-dialog .modal-footer .btn')).click();
  };

  beforeAll(async () => {
    await utils.saveDocNative(privacyPolicies);
    await utils.saveDocNative(PARENT_PLACE);
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
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);

      await helper.waitElementToPresentNative(element(by.css('#privacy-policy-wrapper')));
      let content = await helper.getTextFromElement(element(by.css('#privacy-policy-wrapper .html-content')));
      expect(content).toEqual('English Privacy Policy\nMore markup');

      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      acceptButton.click();
      await commonElements.calmNative();
      await utils.resetBrowser();
      // no privacy policy on next load
      await commonElements.calmNative();
      await closeTourModal();
      await helper.handleUpdateModalNative();

      browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy.configuration'));
      await helper.waitElementToBeVisible(privacyPolicyContainer);
      content = await helper.getTextFromElement(privacyPolicyContainer);
      expect(content).toEqual('English Privacy Policy\nMore markup');

      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
      await commonElements.calmNative(); // no privacy policy on 2nd login

      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password, false, 'fr'); // login in french now
      const contentFr = await helper.getTextFromElement(element(by.css('#privacy-policy-wrapper .html-content')));
      expect(contentFr).toEqual('Politique de confidentialité en Francais\nPlus de markup');
      element(by.css('#privacy-policy-wrapper .btn')).click();
      await commonElements.calmNative();
    });
  });

  describe('for a french offline user', () => {
    afterEach(async () => {
      await utils.deleteUsersNative([offlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      await browser.wait(() => utils.createUsersNative([offlineUser]).then(() => true));
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('offline', password, false, 'fr');
      expect(true).toEqual(true);

      await helper.waitElementToPresentNative(element(by.css('#privacy-policy-wrapper')));
      const content = helper.getTextFromElement(by.css('#privacy-policy-wrapper .html-content'));
      expect(content).toEqual('Politique de confidentialitén Francais\nPlus de markup');

      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      acceptButton.click();
      await commonElements.calmNative();
      await utils.resetBrowser();
      // no privacy policy on next load
      await commonElements.calmNative();
      await closeTourModal();
      await helper.handleUpdateModalNative();
  /*
      browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy.configuration'));
      await helper.waitElementToBeVisible(privacyPolicyContainer);
      const contentText = helper.getTextFromElement(privacyPolicyContainer);
      expect(contentText).toEqual('Politique de confidentialité en Francais\nPlus de markup');

      const updatePrivacyPolicyInFrench = 'Cette text est totalement different c`est fois!';

      browser.wait(() => {
        return utils
          .getDoc('privacy-policies')
          .then(doc => {
            doc.privacy_policies.fr = 'new_attachment';
            doc._attachments.new_attachment = {
              content_type: 'text/html',
              data: Buffer.from(updatePrivacyPolicyInFrench).toString('base64'),
            };

            return utils.saveDoc(doc);
          })
          .then(() => true);
      });
      commonElements.sync();
      browser.driver.navigate().refresh();

      const contentUpdated = element(by.css('#privacy-policy-wrapper .html-content')); // privacy policy updated
      expect(helper.getTextFromElement(contentUpdated)).toEqual(updatePrivacyPolicyInFrench);
      element(by.css('#privacy-policy-wrapper .btn')).click();
      commonElements.calm();*/
    });
  });
});
