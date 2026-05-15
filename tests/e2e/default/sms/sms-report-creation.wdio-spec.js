const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const gatewayApiUtils = require('@utils/gateway-api');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { CONTACT_TYPES } = require('@medic/constants');

const SMS_FORMS_SETTINGS = {
  transitions: { registration: true, update_clinics: true },
  forms: {
    PREG: {
      meta: { code: 'PREG', label: { en: 'Pregnancy Registration' } },
      fields: {
        patient_name: {
          labels: { tiny: { en: 'N' }, short: { en: 'Name' } },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true,
        },
      },
      public_form: true,
      use_sentinel: true,
    },
    DEL: {
      meta: { code: 'DEL', label: { en: 'Delivery Report' } },
      fields: {
        patient_id: {
          labels: { tiny: { en: 'PID' }, short: { en: 'PID' } },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true,
        },
      },
      public_form: true,
      use_sentinel: true,
    },
  },
  registrations: [
    {
      form: 'PREG',
      events: [{ name: 'on_create', trigger: 'add_patient', params: { patient_name_field: 'patient_name' } }],
      messages: [{
        event_type: 'report_accepted',
        message: [{ locale: 'en', content: 'Pregnancy registered for {{fields.patient_name}}.' }],
        recipient: 'reporting_unit',
      }],
    },
    {
      form: 'DEL',
      events: [],
      messages: [{
        event_type: 'report_accepted',
        message: [{ locale: 'en', content: 'Delivery report received.' }],
        recipient: 'reporting_unit',
      }],
    },
  ],
};

describe('SMS report creation', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const chwPerson = personFactory.build({
    phone: '+12065550100',
    parent: { _id: healthCenter._id },
  });

  const chwUser = userFactory.build({ place: healthCenter._id, contact: chwPerson._id });

  before(async () => {
    await utils.saveDocs([...places.values(), chwPerson]);
    await utils.createUsers([chwUser]);
    await utils.updateSettings(SMS_FORMS_SETTINGS, { ignoreReload: true });
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.revertSettings(true);
    await utils.revertDb([/^form:/], true);
    await utils.deleteUsers([chwUser]);
  });

  describe('pregnancy registration via SMS', () => {
    it('should create a report visible in the Reports tab', async () => {
      await gatewayApiUtils.api.postMessage({
        id: 'msg-preg-001',
        from: chwPerson.phone,
        content: 'PREG Jane Doe',
      });
      await sentinelUtils.waitForSentinel();

      await commonPage.goToReports();
      const firstReport = await reportsPage.leftPanelSelectors.firstReport();
      await reportsPage.openSelectedReport(firstReport);
      await commonPage.waitForPageLoaded();

      const reportName = await reportsPage.rightPanelSelectors.reportName();
      expect(await reportName.getText()).to.contain('Pregnancy Registration');

      const senderPhone = await reportsPage.rightPanelSelectors.senderPhone();
      expect(await senderPhone.getText()).to.contain(chwPerson.phone);

      const replyMessage = await reportsPage.rightPanelSelectors.automaticReplyMessage();
      expect(await replyMessage.getText()).to.contain('Pregnancy registered for Jane Doe');
    });
  });

  describe('delivery report via SMS', () => {
    it('should create a delivery report visible in the Reports tab', async () => {
      await gatewayApiUtils.api.postMessage({
        id: 'msg-del-001',
        from: chwPerson.phone,
        content: 'DEL 12345',
      });
      await sentinelUtils.waitForSentinel();

      await commonPage.goToReports();
      const firstReport = await reportsPage.leftPanelSelectors.firstReport();
      await reportsPage.openSelectedReport(firstReport);
      await commonPage.waitForPageLoaded();

      const reportName = await reportsPage.rightPanelSelectors.reportName();
      expect(await reportName.getText()).to.contain('Delivery Report');

      const senderPhone = await reportsPage.rightPanelSelectors.senderPhone();
      expect(await senderPhone.getText()).to.contain(chwPerson.phone);

      const replyMessage = await reportsPage.rightPanelSelectors.automaticReplyMessage();
      expect(await replyMessage.getText()).to.contain('Delivery report received');
    });
  });
});
