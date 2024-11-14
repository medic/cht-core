const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('More Options Menu - Offline User - Edit permissions disabled', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const health_center = places.get('health_center');
  const district_hospital = places.get('district_hospital');
  let xmlReportId;
  let smsReportId;

  const contact = personFactory.build({
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
      { form: 'P',  patient_id: patient._id, },
      { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id}, },
    );

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient]);
    let result = await utils.saveDoc(xmlReport);
    xmlReportId = result.id;
    result = await utils.saveDoc(smsReport);
    smsReportId = result.id;
    await utils.createUsers([offlineUser]);
    await utils.updatePermissions(offlineUser.roles, [], ['can_edit']);
    await loginPage.login(offlineUser);
  });

  after(async () => await utils.revertSettings(true));

  describe('Contact tab', () => {
    it('should hide the kebab menu.', async () => {
      await commonPage.goToPeople(patient._id);
      await commonPage.closeReloadModal();
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });
  });

  describe('Report tab', () => {
    it('should hide the kebab menu when the sms report is opened.', async () => {
      await reportPage.goToReportById(smsReportId);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });

    it('should hide the kebab menu when the xml report is opened.', async () => {
      await reportPage.goToReportById(xmlReportId);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });
  });
});
