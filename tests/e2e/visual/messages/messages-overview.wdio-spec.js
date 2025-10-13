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

  const conversations = [
    {
      phone: '+15551230001',
      contactName: 'CHW Jane',
      messages: [
        'Yes, the child is feeling much better',
        'Here is the update you requested',
        'Thanks for checking'
      ]
    },
    {
      phone: '+15551230002', 
      contactName: 'CHW Alfonso',
      messages: [
        'Helen missed her appointment today',
        'She will reschedule for next week',
        'Should I follow up with her?'
      ]
    },
    {
      phone: '+15551230003',
      contactName: 'Manager Ann',
      messages: [
        'The antenatal care training went well',
        'All CHWs attended the session',
        'Feedback was very positive'
      ]
    },
    {
      phone: '+15551230004',
      contactName: 'Nurse Mary',
      messages: [
        'Fiona has just arrived for her visit',
        'Appointment running on schedule',
        'All vital signs normal'
      ]
    },
    {
      phone: '+15551230005',
      contactName: 'Julie Johnson',
      messages: [
        'Please don\'t forget about the supplies',
        'Inventory check due tomorrow',
        'Need to order more vaccines'
      ]
    },
    {
      phone: '+15551230006',
      contactName: 'Janet Mwangi',
      messages: [
        'Hi Janet, a pregnancy for Beatrice Bass has been registered',
        'You will receive ANC notifications for this patient',
        'Please follow up to identify the patient'
      ]
    }
  ];

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
    
    let messageCounter = 1;
    for (const conv of conversations) {
      for (const message of conv.messages) {
        await seedIncomingSms(conv.phone, message, `visual-${messageCounter}`);
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
