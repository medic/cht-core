const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const dataFactory = require('@factories/cht/generate');
const utils = require('@utils');
const { generateScreenshot, resizeWindowForScreenshots, isMobile } = require('@utils/screenshots');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

describe('Messages Overview', () => {
  const docs = dataFactory.createHierarchy({
    name: 'Kiambu',
    user: true,
    nbrClinics: 5,
    nbrPersons: 8,
    useRealNames: true,
  });

  const seedIncomingSms = async (contact, text, id = 'visual-a') => {
    const smsRecord = {
      type: 'data_record',
      from: contact.phone,
      contact: {
        _id: contact._id,
        parent: contact.parent
      },
      sms_message: {
        message: text,
        from: contact.phone
      },
      reported_date: new Date().valueOf()
    };
    
    await utils.saveDoc(smsRecord);
  };

  let conversations = [];

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
    
    let messageCounter = 1;
    for (const conv of conversations) {
      for (const message of conv.messages) {
        await seedIncomingSms(conv.contact, message, `visual-${messageCounter}`);
        messageCounter++;
        await browser.pause(100);
      }
    }
    
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
    const mainConversation = conversations[0];
    await messagesPage.openMessage(mainConversation.phone);
    await browser.pause(500);
    await generateScreenshot('messages', 'conversation');
  });

  it('opens compose modal', async function () {
    if (await isMobile()) {
      await commonPage.clickFastActionFAB({ waitForList: false });
    } else {
      await commonPage.clickFastActionFlat({ waitForList: false });
    }

    await browser.pause(500);
    await generateScreenshot('messages', 'compose');
    if (await modalPage.checkModalIsOpen()) {
      await modalPage.cancel();
    }
  });

});
