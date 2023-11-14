const uuid = require('uuid').v4;
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const sms = require('@utils/sms');

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const health_center = places.get('health_center');
const district_hospital = places.get('district_hospital');
const contact = personFactory.build({
  _id: uuid(),
  name: 'contact',
  phone: '+12068881234',
  place: health_center._id,
  type: 'person',
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
});

const onlineUser = userFactory.build({
  username: 'onlineuser',
  roles: [ 'program_officer' ],
  place: district_hospital._id,
  contact: contact._id,
});

const patient = personFactory.build({
  _id: uuid(),
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

describe('Online User', () => {

  afterEach(async () => await commonPage.goToBase());

  describe('Options disabled when no items - messages, contacts, people', () => {
    before(async () => await loginPage.cookieLogin());

    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'messages')).to.be.false;
    });

    it(' - Contact tab', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
    });

    it('- Report tab', async () => {
      await commonPage.goToReports();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete', 'reports')).to.be.false;
    });
  });

  describe(' - Contact tab - user has no contact ', () => {
    before(async () => await utils.saveDocs([ ...places.values(), contact, patient]));

    it(' - no contact selected', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
    });
  });

  describe(' - Options enabled when there are items', () => {
    let xmlReportId;
    let smsReportId;

    before(async () => {
      await utils.createUsers([onlineUser]);
      await loginPage.cookieLogin({ ...onlineUser, createUser: false });
      let result = await utils.saveDoc(xmlReport);
      xmlReportId = result.id;
      result = await utils.saveDoc(smsReport);
      smsReportId = result.id;
      await sms.sendSms('testing', contact.phone);
    });

    it('- Reports tab - Edit invisible when NON XML report selected', async () => {
      await commonPage.goToReports();
      await reportPage.goToReportById(smsReportId);
      await (await reportPage.reportBodyDetails()).waitForDisplayed();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
    });

    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.waitForLoaderToDisappear();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'messages')).to.be.true;
    });

    it('- Reports tab - options enabled when XML report selected', async () => {
      await reportPage.goToReportById(xmlReportId);
      await reportPage.reportBodyDetails().waitForDisplayed();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('edit', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
    });

    it(' - Contact Tab  - contact selected', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.true;
    });
  });
});


