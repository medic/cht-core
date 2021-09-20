const commonElements = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
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
    roles: ['chw'],
    known: true
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
    known: true,
    roles: ['program_officer']
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

  before(async () => {
    await utils.saveDocs([privacyPolicies, PARENT_PLACE]);
  });

  afterEach(async () => {
    await utils.revertDb(['privacy-policies', 'PARENT_PLACE'], true);
  });

  after(async () => { await utils.revertDb([], 'api'); });

  describe('for an online user', () => {
    afterEach(async () => {
      await utils.deleteUsers([onlineUser]);
    });

    it('should show the correct privacy policy on login', async () => {
      await utils.createUsers([onlineUser]);

      // After first login, check that privacy policy was prompted to user
      await loginPage.login('online', password);
      await browser.waitUntil(async () => { 
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes('English Privacy Policy') && wrapperText.includes('More markup'); 
      });
      // expect(await privacyPolicyPage.getPrivacyPolicyFromOverlay()).toEqual('English Privacy Policy\nMore markup');

      // After accepting, no privacy policy on next load
      await privacyPolicyPage.acceptPrivacyPolicy();
      await browser.url('/');
      
      // Check display when loading privacy policy page
      await privacyPolicyPage.goToPrivacyPolicyConfig();
      await browser.waitUntil(async () => { 
        const wrapperText = await (await privacyPolicyPage.privacyConfig()).getText();
        return wrapperText.includes('English Privacy Policy') && wrapperText.includes('More markup'); 
      },'Timed out waiting for english online privacy to display');

      // No privacy policy on 2nd login
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login('online', password);
      expect(await privacyPolicyPage.privacyWrapper()).not.toBeDisplayed();
      

      // After login in french, check that privacy policy was prompted to user again
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login('online', password,'fr');
      await browser.waitUntil(async () => { 
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes('Politique de confidentialité en Francais') 
          && wrapperText.includes('Plus de markup'); 
      }, 'Timed out waiting for french offline privacy to display');
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
      await utils.deleteUsers([offlineUser]);
    });

    xit('should show the correct privacy policy on login', async () => {
      const frenchPolicyText = 'Politique de confidentialité en Francais\nPlus de markup';
      await utils.createUsers([offlineUser]);

      // After first login in french, check that privacy policy was prompted to user
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login('offline', password,'fr');
      await browser.waitUntil(async () => { 
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes('Politique de confidentialité en Francais') 
          && wrapperText.includes('Plus de markup'); 
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
        return wrapperText.includes('Politique de confidentialité en Francais') 
          && wrapperText.includes('Plus de markup'); 
      }, 'Timed out waiting for french offline privacy to display');

      // Update privacy policies
      const newPolicyText = 'Cette text est totalement different c`est fois!';
      await privacyPolicyPage.updatePrivacyPolicy('privacy-policies', 'fr_attachment', newPolicyText);
      await commonElements.sync();
      await browser.refresh();

      // Privacy policy updated
      await browser.waitUntil(async () => { 
        const wrapperText = await (await privacyPolicyPage.privacyWrapper()).getText();
        return wrapperText.includes(newPolicyText); 
      }, 'Timed out waiting for new offline text');
    });
  });
});
