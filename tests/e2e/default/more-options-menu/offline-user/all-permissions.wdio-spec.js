const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const sms = require('@utils/sms');

describe('More Options Menu - Offline User', () => {
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
  });

  afterEach(async () => await commonPage.goToBase());

  describe('All permissions enabled', () => {

    describe('Message tab', () => {
      it('should hide the kebab menu.', async () => {
        await commonPage.goToMessages();
        await sms.sendSms('testing', contact.phone);
        expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
      });
    });

    describe('Contact tab', () => {
      it('should hide the \'export\' and \'edit\' options and ' +
        'disable the \'delete\' option when no contact is opened', async () => {
        await commonPage.goToPeople();
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
        expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
        expect(await commonPage.isMenuOptionEnabled('delete')).to.be.false;
      });

      it('should hide the \'export\' option and ' +
        'enable the \'edit\' and \'delete\' options when a contact is opened', async () => {
        await commonPage.goToPeople(patient._id);
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
        expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
        expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
      });

      it('should hide the \'export\' and \'edit\' options and ' +
        'disable the \'delete\' option when the offline user\'s place is selected', async () => {
        await commonPage.goToPeople(offlineUser.place);
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
        expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
        expect(await commonPage.isMenuOptionEnabled('delete')).to.be.false;
      });
    });

    describe('Report tab', () => {
      it('should hide the \'export\' and \'edit\' options and ' +
        'enable the \'delete\' and \'review\' options when the sms report is opened', async () => {
        await commonPage.goToReports();
        expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;

        await reportPage.goToReportById(smsReportId);
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
        expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
        expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
        expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
      });

      it('should hide the \'export\' option and ' +
        'enable the \'edit\', \'delete\' and \'review\' options when the xml report is opened', async () => {
        await reportPage.goToReportById(xmlReportId);
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
        expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
        expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
        expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
      });
    });
  });

  describe('All permissions disabled', () => {
    before(async () => {
      const allPermissions = ['can_edit', 'can_delete_contacts', 'can_export_all',
        'can_export_contacts', 'can_export_messages',
        'can_delete_reports', 'can_update_reports'];
      await utils.updatePermissions(offlineUser.roles, [], allPermissions, true);
      await commonPage.sync({ expectReload: true });
    });

    after(async () => await utils.revertSettings(true));

    it('should hide the kebab menu in Messages, People and Reports tabs', async () => {
      await commonPage.goToMessages();
      await sms.sendSms('testing', contact.phone);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;

      await commonPage.goToPeople();
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;

      await contactPage.selectLHSRowByText(contact.name);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;

      await commonPage.goToReports();
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
      await reportPage.goToReportById(smsReportId);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
      await reportPage.goToReportById(xmlReportId);
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });
  });
});

