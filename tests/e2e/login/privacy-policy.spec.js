const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po.js');
const helper = require('../../helper');

const password = 'Sup3rSecret!';

describe('Privacy policy', () => {
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

  const closeTourModal = () => {
    helper.waitElementToBeVisible(element(by.css('.modal-dialog .modal-footer .btn')));
    element(by.css('.modal-dialog .modal-footer .btn')).click();
  };

  beforeAll(() => utils.saveDocs([privacyPolicies, PARENT_PLACE]));
  afterEach(() => utils.revertDb(['privacy-policies', 'PARENT_PLACE']));

  afterAll(() => {
    commonElements.goToLoginPage();
    loginPage.login(auth.username, auth.password);
    return utils.revertDb();
  });

  describe('for an online user', () => {
    afterEach(() => utils.deleteUsers([onlineUser]));

    it('should show the correct privacy policy on login', async () => {
      browser.wait(() => utils.createUsers([onlineUser]).then(() => true));
      commonElements.goToLoginPage();
      loginPage.login('online', password);

      helper.waitElementToPresent(element(by.css('#privacy-policy-wrapper')));

      const content = element(by.css('#privacy-policy-wrapper .html-content'));
      await helper.getTextFromElement(content)
        .then(text => expect(text).toEqual('English Privacy Policy\nMore markup'));
      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      acceptButton.click();
      
      utils.resetBrowser();
      // no privacy policy on next load
      
      closeTourModal();
      helper.handleUpdateModal();

      browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy'));
      helper.waitElementToBeVisible(privacyPolicyContainer);
      await helper.getTextFromElement(privacyPolicyContainer)
        .then(text => expect(text).toContain('English Privacy Policy\nMore markup'));

      commonElements.goToLoginPage();
      loginPage.login('online', password);
      expect(commonElements.isAt('message-list'));
      // no privacy policy on 2nd login
      commonElements.goToLoginPage();
      loginPage.login('online', password, false, 'fr'); // login in french now
      const contentFr = element(by.css('#privacy-policy-wrapper .html-content'));
      await helper.getTextFromElement(contentFr).then(text => expect(text)
        .toEqual('Politique de confidentialité en Francais\nPlus de markup'));
      element(by.css('#privacy-policy-wrapper .btn')).click();      
    });
  });

  describe('for a french offline user', () => {
    afterEach(() => utils.deleteUsers([offlineUser]));

    it('should show the correct privacy policy on login', () => {
      browser.wait(() => utils.createUsers([offlineUser]).then(() => true));
      commonElements.goToLoginPage();
      loginPage.login('offline', password, false, 'fr');

      helper.waitElementToPresent(element(by.css('#privacy-policy-wrapper')));

      const content = element(by.css('#privacy-policy-wrapper .html-content'));
      expect(helper.getTextFromElement(content)).toEqual('Politique de confidentialité en Francais\nPlus de markup');
      const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
      acceptButton.click();
      
      utils.resetBrowser();
      // no privacy policy on next load
      
      closeTourModal();
      helper.handleUpdateModal();

      browser.get(utils.getBaseUrl() + 'privacy-policy');
      const privacyPolicyContainer = element(by.css('.privacy-policy'));
      helper.waitElementToBeVisible(privacyPolicyContainer);
      expect(helper.getTextFromElement(privacyPolicyContainer))
        .toEqual('Politique de confidentialité en Francais\nPlus de markup');

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
      
    });
  });
});
