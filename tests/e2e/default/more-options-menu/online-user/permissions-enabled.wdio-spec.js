const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const sms = require('@utils/sms');

describe('More Options Menu - Online User - Permissions enabled', () => {
  describe('Options displayed when there are no messages, contacts or people created', () => {
    before(async () => await loginPage.cookieLogin());

    after(async () => {
      await commonPage.logout();
    });

    afterEach(async () => {
      await commonPage.goToBase();
      await utils.revertDb([/^form:/], true);
    });

    it('should disable the \'export\' option in Message tab',
      async () => {
        await commonPage.goToMessages();
        await commonPage.openMoreOptionsMenu();
        expect(await commonPage.isMenuOptionEnabled('export')).to.be.false;
      });

    it('should disable the \'export\' option and hide the \'edit\' and \'delete\' options in Contact tab', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
    });

    it('should disable the \'export\' option and hide the \'edit\' and \'delete\' options in Report tab', async () => {
      await commonPage.goToReports();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
    });
  });

  describe('Options displayed when there are messages, contacts and people created', () => {
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

    const onlineUser = userFactory.build({
      roles: [ 'program_officer' ],
      place: district_hospital._id,
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
        { patient, submitter: contact, fields: { lmp_date: 'Dec 3, 2022', patient_id: patient._id}, },
      );

    before(async () => {
      await utils.saveDocs([...places.values(), contact, patient]);
      await utils.createUsers([onlineUser]);
      await loginPage.login(onlineUser);
      xmlReportId = (await utils.saveDoc(xmlReport)).id;
      smsReportId = (await utils.saveDoc(smsReport)).id;
      await sms.sendSms('testing', contact.phone);
    });

    after(async () => {
      await utils.deleteUsers([onlineUser]);
      await utils.revertDb([/^form:/], true);
    });

    afterEach(async () => await commonPage.goToBase());

    it('should enable the \'export\' option in Message tab.', async () => {
      await commonPage.goToMessages();
      await commonPage.waitForLoaderToDisappear();
      await commonPage.waitForPageLoaded();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
    });

    it('should enable the \'export\', \'review\' and \'delete\' options and hide the \'edit\' option in Report tab ' +
      'when a NON XML report is opened.', async () => {
      await reportPage.goToReportById(smsReportId);
      await reportPage.rightPanelSelectors.reportBodyDetails().waitForDisplayed();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
    });

    it('should enable the \'export\', \'review\', \'edit\' and \'delete\' options in Report tab ' +
      'when a XML report is opened.', async () => {
      await reportPage.goToReportById(xmlReportId);
      await reportPage.rightPanelSelectors.reportBodyDetails().waitForDisplayed();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
    });

    it('should enable the \'export\', \'edit\' and \'delete\' options in Contact tab ' +
      'when a contact is opened.', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
    });

    it('should enable the \'export\' option and hide the \'edit\' and \'delete\' options in Contact tab ' +
      'when none of the contacts is opened.', async () => {
      await commonPage.logout();
      await loginPage.cookieLogin();
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
    });
  });
});
