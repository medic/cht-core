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
const sentinelUtils = require('@utils/sentinel');

let xmlReportId;
let smsReportId;
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

describe('Menu options display - Online user', () => {
  before(async () => await loginPage.cookieLogin());

  after(async () => {
    await commonPage.logout();
  });

  afterEach(async () => {
    await commonPage.goToBase();
    await utils.revertDb([/^form:/], true);
  });

  it('should disabled the export option in Message tab when there are no messages, contacts or people created.',
    async () => {
      await commonPage.goToMessages();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionEnabled('export', 'messages')).to.be.false;
    });

  it('should disabled the export option and hide the edit and delete options in Contact tab ' +
    'when there are no messages, contacts or people created.', async () => {
    await commonPage.goToPeople();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.false;
    expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
    expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
  });

  it('should disabled the export option and hide the edit and delete options in Report tab ' +
    'when there are no messages, contacts or people created.', async () => {
    await commonPage.goToReports();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'reports')).to.be.false;
    expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
    expect(await commonPage.isMenuOptionVisible('delete', 'reports')).to.be.false;
  });

  it('should show the export option and hide the edit and delete options in Contact tab ' +
    'when none of the contacts was opened.', async () => {
    await utils.saveDocs([...places.values(), contact, patient]);
    await sentinelUtils.waitForSentinel();
    await commonPage.goToPeople();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.true;
    expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
    expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
  });
});

describe('Options enabled when there are items - Online user', () => {
  before(async () => {
    await utils.saveDocs([...places.values(), contact]);
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
    let result = await utils.saveDoc(xmlReport);
    xmlReportId = result.id;
    result = await utils.saveDoc(smsReport);
    smsReportId = result.id;
    await sms.sendSms('testing', contact.phone);
  });

  after(async () => {
    await utils.deleteUsers([onlineUser]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => await commonPage.goToBase());

  it('should show the export option in Message tab.', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForLoaderToDisappear();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'messages')).to.be.true;
  });

  it('should show the export and delete options and hide the edit option in Report tab ' +
    'when a NON XML report is selected.', async () => {
    await commonPage.goToReports();
    await reportPage.goToReportById(smsReportId);
    await (await reportPage.reportBodyDetails()).waitForDisplayed();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.true;
    expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
    expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
  });

  it('should show the export, edit and delete options in Report tab ' +
    'when a XML report is selected.', async () => {
    await reportPage.goToReportById(xmlReportId);
    await reportPage.reportBodyDetails().waitForDisplayed();
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'reports')).to.be.true;
    expect(await commonPage.isMenuOptionEnabled('edit', 'reports')).to.be.true;
    expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;
  });

  it('should show the export, edit and delete options in Contact tab ' +
    'when a contact was opened.', async () => {
    await commonPage.goToPeople(contact._id);
    await commonPage.openMoreOptionsMenu();
    expect(await commonPage.isMenuOptionEnabled('export', 'contacts')).to.be.true;
    expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
    expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.true;
  });
});
