const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const sms = require('@utils/sms');

describe('More Options Menu - Online User - Permissions disabled', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const health_center = places.get('health_center');
  const district_hospital = places.get('district_hospital');

  const contact = personFactory.build({
    phone: '+12068881234',
    place: health_center._id,
    parent: { _id: health_center._id,  parent: health_center.parent },
  });

  const onlineUser = userFactory.build({
    roles: [ 'program_officer' ],
    place: district_hospital._id,
    contact: contact._id,
  });

  const patient = personFactory.build({
    parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
  });

  const reports = [
    reportFactory.report().build({ form: 'home_visit', content_type: 'xml' }, { patient, submitter: contact })
  ];

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient, ...reports ]);
    await sms.sendSms('testing', contact.phone);
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
    await commonPage.waitForLoaderToDisappear();
    expect(await commonPage.isMessagesListPresent()).to.be.true;
  });

  after(async () => await utils.revertSettings(true));

  describe('Export permissions disabled', () => {
    before(async () => {
      const exportPermissions = ['can_export_all', 'can_export_contacts', 'can_export_messages'];
      await utils.updatePermissions(onlineUser.roles, [], exportPermissions);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));

    it('should hide the \'export\' option and ' +
      'enable the \'edit\' and \'delete\' options when a contact is opened', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
    });

    it('should hide the \'export\' option and ' +
      'enable the \'edit\', \'delete\' and \'review\' options when a report is opened', async () => {
      await commonPage.goToReports();
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
      (await reportPage.leftPanelSelectors.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
    });

    it('should hide the kebab menu on the Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.waitForLoaderToDisappear();
      expect(await commonPage.isMessagesListPresent()).to.be.true;
      expect(await commonPage.isMoreOptionsMenuPresent()).to.be.false;
    });
  });

  describe('Delete permissions disabled', () => {
    before(async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_delete_contacts', 'can_delete_reports']);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));

    it('should hide the \'delete\' option and ' +
      'enable the \'edit\' and \'export\' options when a contact is opened', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
    });

    it('should hide the \'delete\' option and ' +
      'enable the \'edit\', \'export\' and \'review\' options when a report is opened', async () => {
      await commonPage.goToReports();
      (await reportPage.leftPanelSelectors.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('edit')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('review')).to.be.true;
    });
  });

  describe('Edit permissions disabled', () => {
    before(async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_edit']);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));

    it('should hide the \'edit\' and \'delete\' options and ' +
      'enable the \'export\' option when a contact is opened', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
    });

    it('should hide the \'edit\', \'delete\' and \'review\' options and ' +
      'enable the \'export\' option when a report is opened', async () => {
      await commonPage.goToReports();
      (await reportPage.leftPanelSelectors.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('edit')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('review')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('export')).to.be.true;
    });
  });
});




