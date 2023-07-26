const uuid = require('uuid').v4;

const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const browserDbUtils = require('@utils/cht-db');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');

const contact = personFactory.build(
  {
    parent: {
      _id: clinic._id,
      parent: clinic.parent
    },
    phone: '+254712345670'
  });

const docs = [...places.values(), contact];
const newRole = 'new_chw';

const addRole = async (role = newRole) => {
  const settings = await utils.getSettings();
  settings.roles[role] = { name: newRole, offline: true };
  Object.values(settings.permissions).forEach(roles => {
    if (roles.includes('chw')) {
      roles.push(newRole);
    }
  });
  await utils.updateSettings(settings, true);
};

const username = uuid();
const user = {
  username: username,
  password: uuid(),
  place: clinic._id,
  contact: contact._id,
  roles: [newRole]
};

describe('Database access for new roles', () => {
  before(async () => {
    await utils.saveDocs(docs);
    await addRole(newRole);
    await utils.createUsers([user]);
  });

  it('user with custom role should be able to log in', async () => {
    await loginPage.login({ username: username, password: user.password });
  });

  it('should be able to sync documents up', async () => {
    const report = {
      _id: uuid(),
      type: 'data_record',
      form: 'something',
      contact: { _id: contact._id },
      fields: { patient_id: contact._id, },
    };
    await browserDbUtils.createDoc(report);
    await commonPage.sync();

    await utils.getDoc(report._id);
  });

  it('should be able to sync documents down', async () => {
    const report = {
      _id: uuid(),
      type: 'data_record',
      form: 'something',
      contact: { _id: contact._id },
      fields: { patient_id: contact._id, },
    };
    await utils.saveDoc(report);
    await commonPage.sync();
    await browserDbUtils.getDoc(report._id);
  });
});
