const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('More Options Menu - Offline User - Delete permissions disabled', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const health_center = places.get('health_center');
  const district_hospital = places.get('district_hospital');
  let xmlReportId;
  let smsReportId;

  const contact = personFactory.build({
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
    parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
  });
  const xmlReport = reportFactory
    .report()
    .build(
      { form: 'home_visit', content_type: 'xml' },
      { patient, submitter: contact }
    );

  const smsReport = reportFactory
    .report()
    .build(
      { form: 'P', patient_id: patient._id, },
      { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id }, },
    );

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient]);
    xmlReportId = (await utils.saveDoc(xmlReport)).id;
    smsReportId = (await utils.saveDoc(smsReport)).id;
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await utils.updatePermissions(offlineUser.roles, [], ['can_delete_contacts', 'can_delete_reports']);
    await commonPage.closeReloadModal();
    await commonPage.sync();
  });

  after(async () => await utils.revertSettings(true));

  describe('Contact Tab', () => {
    it('should enable the \'edit\' option and ' +
      'hide the \'export\' and \'delete\' options when a contact is opened', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.closeReloadModal();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
    });
  });

  describe('Report tab', () => {
    it('should hide the kebab menu when the sms report is opened', async () => {
      await reportPage.goToReportById(smsReportId);
      expect(commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });

    it('should enable the \'edit\' and \'review\' option and ' +
      'hide the \'export\' and \'delete\' options when the xml report is opened', async () => {
      await reportPage.goToReportById(xmlReportId);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('edit', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review', 'report')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete', 'reports')).to.be.false;
    });
  });
});

