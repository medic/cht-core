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

  const sampleMessages = [
    ['Yes, the child is feeling much better', 'Here is the update you requested', 'Thanks for checking'],
    ['Helen missed her appointment today', 'She will reschedule for next week', 'Should I follow up with her?'],
    ['The antenatal care training went well', 'All CHWs attended the session', 'Feedback was very positive'],
    ['Fiona has just arrived for her visit', 'Appointment running on schedule', 'All vital signs normal'],
    ['Please don\'t forget about the supplies', 'Inventory check due tomorrow', 'Need to order more vaccines'],
    ['Hi Janet, a pregnancy for Beatrice Bass has been registered', 
      'You will receive ANC notifications for this patient',
      'Please follow up to identify the patient']
  ];

  const contactsWithPhones = docs.persons.filter(person => person.phone && person.phone.trim() !== '').slice(0, 6);
  const conversations = contactsWithPhones.map((contact, index) => ({
    phone: contact.phone,
    contactName: contact.name,
    contact: contact,
    messages: sampleMessages[index] || sampleMessages[0]
  }));

  const createSmsMessages = () => {
    const smsDocs = [];
    let messageCounter = 1;
    
    for (const conv of conversations) {
      for (const message of conv.messages) {
        const smsDoc = {
          type: 'data_record',
          from: conv.phone,
          form: undefined,
          errors: [],
          tasks: [],
          fields: {},
          reported_date: Date.now() - (messageCounter * 1000),
          sms_message: {
            message: message,
            from: conv.phone,
            sent_timestamp: Date.now() - (messageCounter * 1000)
          },
          contact: conv.contact,
          read: []
        };
        smsDocs.push(smsDoc);
        messageCounter++;
      }
    }
    
    return smsDocs;
  };

  const smsMessages = createSmsMessages();

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
    await seedSmsMessages();
    await commonPage.goToMessages();
    await commonPage.waitForLoaders();
  });

  it('shows conversations list', async () => {
    await browser.pause(500);
    await generateScreenshot('messages', 'list');
  });

  it('opens conversation and shows header and thread', async () => {
    if (await modalPage.isDisplayed()) {
      await modalPage.cancel();
    }
    const mainConversation = conversations[0];
    await messagesPage.openMessage(mainConversation.contact._id);
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
