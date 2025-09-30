const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const dataFactory = require('@factories/cht/generate');
const utils = require('@utils');
const { generateScreenshot, isMobile, resizeWindowForScreenshots } = require('@utils/screenshots');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

describe('Messages Overview', () => {
  const docs = dataFactory.createHierarchy({
    name: 'Visual Messaging User',
    user: true,
    nbrClinics: 2,
    nbrPersons: 3,
    useRealNames: true,
  });

  const seedIncomingSms = async (from, text, id = 'visual-a') => {
    await utils.request({
      method: 'POST',
      path: '/api/sms',
      body: { messages: [ { from, content: text, id } ] }
    });
  };

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
  });

  describe('List and conversation', () => {
    const phone = '+15551230001';
    const msg1 = 'Hello from visual test';

    before(async () => {
      await seedIncomingSms(phone, msg1);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await commonPage.waitForLoaders();
    });

    it('shows conversations list', async () => {
      await generateScreenshot('messages', 'list');
    });

    it('opens conversation and shows header and thread', async () => {
      if (await modalPage.isDisplayed()) {
        await modalPage.cancel();
      }
      await messagesPage.openMessage(phone);
      await generateScreenshot('messages', 'conversation');
    });

    it('shows reply area and actions', async () => {
      await generateScreenshot('messages', 'reply-area');
    });
  });

  it('opens compose modal', async function () {
    if (await isMobile()) {
      await commonPage.clickFastActionFAB({ waitForList: false });
    } else {
      await commonPage.clickFastActionFlat({ waitForList: false });
    }
    await generateScreenshot('messages', 'compose');
    if (await modalPage.checkModalIsOpen()) {
      await modalPage.cancel();
    }
  });

});
