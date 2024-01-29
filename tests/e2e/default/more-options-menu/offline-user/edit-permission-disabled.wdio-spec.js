const uuid = require('uuid').v4;
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const health_center = places.get('health_center');
const district_hospital = places.get('district_hospital');

const contact = personFactory.build({
  _id: uuid(),
  name: 'OfflineContact',
  phone: '+12068881234',
  place: health_center._id,
  type: 'person',
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
});

const offlineUser = userFactory.build({
  username: 'offlineuser',
  isOffline: true,
  roles: ['chw'],
  place: health_center._id,
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
    { form: 'P',  patient_id: patient._id, },
    { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id}, },
  );

describe('- EDIT permissions disabled', () => {
  let xmlReportId;
  let smsReportId;
  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient]);
    let result = await utils.saveDoc(xmlReport);
    xmlReportId = result.id;
    result = await utils.saveDoc(smsReport);
    smsReportId = result.id;
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await utils.updatePermissions(offlineUser.roles, [], ['can_edit']);
    await commonPage.closeReloadModal();
  });

  after(async () => await utils.revertSettings(true));

  it(' - Contact Tab - contact selected', async () => {
    await commonPage.goToPeople(patient._id);
    await commonPage.closeReloadModal();
    expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
  });

  it('- Report tab - menu not displayed when sms report selected', async () => {
    await reportPage.goToReportById(smsReportId);
    expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
  });

  it('- Report tab - menu not displayed when xml report selected', async () => {
    await reportPage.goToReportById(xmlReportId);
    expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
  });
});
