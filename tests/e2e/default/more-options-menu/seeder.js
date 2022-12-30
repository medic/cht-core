const uuid = require('uuid').v4;
const moment = require('moment');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');
const placeFactory = require('../../../factories/cht/contacts/place');
const reportFactory = require('../../../factories/cht/reports/generic-report');
const personFactory = require('../../../factories/cht/contacts/person');
const userFactory = require('../../../factories/cht/users/users');
const today = moment();

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const health_center = places.get('health_center');
const district_hospital = places.get('district_hospital');
const contact = {
  _id: uuid(),
  name: 'OfflineContact',
  phone: '+12068881234',
  place: health_center._id,
  type: 'person',
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
};
const contact2 = {
  _id: uuid(),
  name: 'OnlineContact',
  phone: '+12068881235',
  place: district_hospital._id,
  type: 'person',
  parent: {
    _id: district_hospital._id,
  },
};
const offlineUser = userFactory.build({
  username: 'offlineuser',
  isOffline: true,
  roles:['chw'],
  place: health_center._id,
  contact: contact._id,
});
const onlineUser = userFactory.build({
  username: 'onlineuser',
  roles: [ 'program_officer' ],
  place: district_hospital._id,
  contact: contact2._id,
});
const patient = personFactory.build({
  _id: uuid(),
  parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
});

const reports = [
  reportFactory.build(
    {
      form: 'P',
      reported_date: moment([ today.year(), today.month() - 4, 1, 23, 30 ]).valueOf(),
      patient_id: patient._id,
    },
    {
      patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id},
    },
  ),
];

const reportXml = reportFactory.build(
  { form: 'pregnancy_danger_sign' },
  { patient, submitter: onlineUser.contact, fields: { t_danger_signs_referral_follow_up: 'yes' },
  });

const saveDocs = async () => {
  await utils.saveDocs([ ...places.values(), contact, contact2, patient, ...reports ]);
};

const updateSettings = async (settings) => {
  await utils.revertSettings(true);
  await utils.updateSettings(settings, true);
};
  
const updatePermissions = async (role, addPermissions, removePermissions = []) => {
  const settings = await utils.getSettings();
  settings.roles[role] = { offline: true };
  addPermissions.map(permission => settings.permissions[permission].push(role));
  removePermissions.forEach(permission => {
    settings.permissions[permission] = settings.permissions[permission].filter(r => r !== role);
  });
  await updateSettings({ roles: settings.roles, permissions: settings.permissions });
};
  
const saveXmlReports = async () => {
  await utils.saveDocs([reportXml]);
};
  
const newLogin = async (user) => {
  await browser.reloadSession();
  await browser.url('/');
  await loginPage.login(user);
  await commonPage.closeTour();
  await (await commonPage.messagesTab()).waitForDisplayed();
};

const sendMessage = async (message = 'Testing', phone = contact.phone) => {
  await utils.request({
    method: 'POST',
    path: '/api/v2/records',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body:`message=${message}&from=${phone}`,
  });  
};

module.exports = {
  saveDocs,  
  saveXmlReports,
  updatePermissions,
  onlineUser,
  offlineUser,
  newLogin,
  sendMessage,
  contact,
};

