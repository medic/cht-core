const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const sms = require('@utils/sms');

describe('More Options Menu - Offline User', () => {
  const places = placeFactory.generateHierarchy();
  const health_center = places.get('health_center');
  let xmlReportId;
  let smsReportId;

  const contact = personFactory.build({
    name: 'chw_robert',
    phone: '+12068881234',
    place: health_center._id,
    parent: { _id: health_center._id, parent: health_center.parent },
  });

  const offlineUser = userFactory.build({
    isOffline: true,
    place: health_center._id,
    contact: contact._id,
  });

  const patient = personFactory.build({
    name: 'patient_sarah',
    parent: health_center
  });

  const xmlReport = reportFactory
    .report()
    .build(
      { form: 'home_visit', content_type: 'xml' },
      { patient, submitter: contact },
    );

  const smsReport = reportFactory
    .report()
    .build(
      { form: 'P', patient_id: patient._id, },
      { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id }, },
    );

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient ]);
    xmlReportId = (await utils.saveDoc(xmlReport)).id;
    smsReportId = (await utils.saveDoc(smsReport)).id;
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  describe('Message tab', () => {
    it('should hide the kebab menu.', async () => {
      await sms.sendSms('testing', contact.phone);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
    });
  });

  describe('Contact tab', () => {

    beforeEach(async () => {
      await commonPage.goToBase();
    });

    it('should hide the \'export\' option and ' +
      'enable the \'edit\' and \'delete\' options when a contact is opened', async () => {
      await commonPage.goToPeople();
      await contactsPage.selectLHSRowByText(patient.name);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.true;
    });

    it('should hide the \'export\' and \'edit\' options and ' +
      'disable the \'delete\' option when the offline user\'s place is selected', async () => {
      await commonPage.goToPeople();
      await contactsPage.selectLHSRowByText(health_center.name);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.false;
    });
  });

  describe('Report tab', () => {
    it('should hide the \'export\' and \'edit\' options and ' +
      'enable the \'delete\' and \'review\' options when the sms report is opened', async () => {
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;

      await reportPage.goToReportById(smsReportId);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review', 'report')).to.be.true;
    });

    it('should hide the \'export\' option and ' +
      'enable the \'edit\', \'delete\' and \'review\' options when the xml report is opened', async () => {
      await reportPage.goToReportById(xmlReportId);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review', 'report')).to.be.true;
    });
  });
});

