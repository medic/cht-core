const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const gatewayApiUtils = require('@utils/gateway-api');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
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
    },
    DEL: {
      meta: { code: 'DEL', label: { en: 'Delivery Report' } },
      fields: {},
    },
  },
  registrations: [
    {
      form: 'PREG',
      events: [{ name: 'on_create', trigger: 'add_patient', params: { patient_name_field: 'patient_name' } }],
      messages: [{
        event_type: 'report_accepted',
        translation_key: 'sms.preg.registered',
        recipient: 'reporting_unit',
      }],
    },
    {
      form: 'DEL',
      events: [],
      messages: [{
        event_type: 'report_accepted',
        translation_key: 'sms.del.received',
        recipient: 'reporting_unit',
      }],
    },
  ],
};

const findReportByGatewayRef = async (gatewayRef) => {
  const { rows } = await utils.db.allDocs({ include_docs: true });
  return rows.find(({ doc }) => doc && doc.sms_message && doc.sms_message.gateway_ref === gatewayRef)?.doc;
};

describe('SMS report creation', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const chwUser = userFactory.build({ place: healthCenter._id });

  before(async () => {
    await utils.saveDocs([...places.values(), chwUser]);
    await utils.createUsers([chwUser]);
    await utils.addTranslations('en', {
      'sms.preg.registered': 'Pregnancy registered for {{fields.patient_name}}.',
      'sms.del.received': 'Delivery report received.',
    });
    await utils.updateSettings(SMS_FORMS_SETTINGS, { ignoreReload: true });
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await sentinelUtils.waitForSentinel();
    const { rows } = await utils.db.allDocs({ include_docs: true });
    const reports = rows
      .filter(({ doc }) => doc && doc.type === 'data_record')
      .map(({ doc }) => ({ _id: doc._id, _rev: doc._rev, _deleted: true }));
    if (reports.length) {
      await utils.db.bulkDocs(reports);
    }
  });

  after(async () => {
    await utils.revertSettings(true);
    await utils.revertDb([/^form:/], true);
    await utils.deleteUsers([chwUser]);
  });

  describe('pregnancy registration via SMS', () => {
    it('should create a report and register the patient', async () => {
      await gatewayApiUtils.api.postMessage({
        id: 'msg-preg-001',
        from: chwUser.phone,
        content: 'PREG Jane Doe',
      });
      await sentinelUtils.waitForSentinel();

      const report = await findReportByGatewayRef('msg-preg-001');
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();
      await reportsPage.openSelectedReport(await reportsPage.leftPanelSelectors.reportByUUID(report._id));
      await commonPage.waitForPageLoaded();

      expect(await (await reportsPage.rightPanelSelectors.reportName()).getText()).to.contain('Pregnancy Registration');
      expect(await (await reportsPage.rightPanelSelectors.patientName()).getText()).to.contain('Jane Doe');
      expect(await (await reportsPage.rightPanelSelectors.senderPhone()).getText()).to.contain(chwUser.phone);
      expect(await (await reportsPage.rightPanelSelectors.automaticReplyMessage()).getText())
        .to.contain('Pregnancy registered for Jane Doe');
    });
  });

  describe('delivery report via SMS', () => {
    it('should create a delivery report visible in the Reports tab', async () => {
      await gatewayApiUtils.api.postMessage({
        id: 'msg-del-001',
        from: chwUser.phone,
        content: 'DEL',
      });
      await sentinelUtils.waitForSentinel();

      const report = await findReportByGatewayRef('msg-del-001');
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();
      await reportsPage.openSelectedReport(await reportsPage.leftPanelSelectors.reportByUUID(report._id));
      await commonPage.waitForPageLoaded();

      expect(await (await reportsPage.rightPanelSelectors.reportName()).getText()).to.contain('Delivery Report');
      expect(await (await reportsPage.rightPanelSelectors.senderPhone()).getText()).to.contain(chwUser.phone);
      expect(await (await reportsPage.rightPanelSelectors.automaticReplyMessage()).getText())
        .to.contain('Delivery report received');
    });
  });
});
