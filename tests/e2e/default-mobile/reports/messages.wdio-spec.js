const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
// const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const appSettings = require('./test-app_settings');

describe('Reports tab', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');
//   const user = userFactory.build({ place: clinic._id, roles: [ 'program_officer' ] });

//   const offlineUserContact = {
//     _id: 'fixture:user:offline',
//     name: 'OfflineUser',
//     phone: '+25474425741',
//     place: clinic._id,
//     type: 'person',
//     parent: { _id: clinic._id }
//   };

//   const offlineUser = userFactory.build({ 
//     username: 'offline_user',
//     phone: '+25474425741', 
//     place: healthCenter._id,
//     roles: [ 'program_officer' ],
//     contact: offlineUserContact
//   });

//   const person = personFactory.build({
//     phone: '+25474425741',
//     patient_id: '123456',
//     parent: {_id: clinic._id, parent: clinic.parent}
//   });





  const offlineUserContact = {
    _id: 'fixture:user:user1',
    name: 'OfflineUser',
    phone: '+25474425741',
    place: healthCenter._id,
    type: 'person',
    // parent: { _id: healthCenter._id, parent: healthCenter.parent },
    parent: { _id: healthCenter._id },
  };
//   const onlineUserContact = {
//     _id: 'fixture:user:user2',
//     name: 'OnlineUser',
//     phone: '+12068881235',
//     place: districtHospital._id,
//     type: 'person',
//     parent: { _id: districtHospital._id },
//   };
  const offlineUser = userFactory.build({
    username: 'offlineuser_messages',
    isOffline: true,
    place: healthCenter._id,
    contact: offlineUserContact._id,
  });
//   const onlineUser = userFactory.build({
//     username: 'onlineuser_messages',
//     roles: [ 'program_officer' ],
//     place: districtHospital._id,
//     contact: onlineUserContact._id,
//   });
  const person = personFactory.build({
    _id: 'patient1',
    phone: '+14152223344',
    name: 'patient1',
    parent: { _id: clinic._id, parent: { _id: healthCenter._id, parent: { _id: districtHospital._id }}}
    // parent: { _id: clinic._id, parent: { _id: healthCenter._id, parent: { _id: districtHospital._id }}}
  });









  const report = {
    _id: 'REF_REF_V1',
    form: 'RR',
    type: 'data_record',
    from: offlineUser.phone,
    fields: {
      patient_id: person.patient_id
    },
    sms_message: {
      from: offlineUser.phone,
      message: `1!RR!${person.patient_id}`,
      form: 'RR',
    },
  };

  before(async () => {
    await utils.updateSettings(appSettings.WITH_SMS_FORMS, true);
    console.log("1")
    await utils.saveDocs([...places.values(), person]);
    console.log("2")
    await utils.saveDocs([report]);
    console.log("3")
    await utils.createUsers([offlineUser]);
    console.log("4")
    await loginPage.login(offlineUser);
    console.log("5")
  });

  after(async () => await utils.revertSettings(true));

  afterEach(async () => await utils.deleteAllDocs([/^form:/].concat(...places.values()).concat(person._id)));

  it('should see option to send message', async () => {
    await sentinelUtils.waitForSentinel([report._id]);

    await commonElements.goToReports();
    const firstReport = await reportsPage.firstReport();
    await reportsPage.openSelectedReport(firstReport);
    // await commonElements.waitForPageLoaded();

    await browser.pause(900000)

    // const fabLabels = await commonElements.getFastActionItemsLabels();
    // const fabLabels = await commonElements.multipleActions();
    await commonElements.clickFastActionFAB({ waitForList: false });

    expect(fabLabels).to.include.members(['Edit facility', 'Send message', 'Fake']);

    // await browser.pause(480000)

    // await verifyListReportContent({ formName: 'REF_REF' });
    // await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });

    // await browser.pause(480000)
  });
});
