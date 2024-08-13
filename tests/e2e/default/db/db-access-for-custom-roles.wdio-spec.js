const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const browserDbUtils = require('@utils/cht-db');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const genericReportFactory = require('@factories/cht/reports/generic-report');

describe('Database access for new roles', () => {
  const NEW_ROLE = 'new_chw';
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');

  const contact = personFactory.build({
    parent: { _id: clinic._id, parent: clinic.parent },
    phone: '+254712345670'
  });

  const user = userFactory.build({
    place: clinic._id,
    contact: contact._id,
    roles: [NEW_ROLE]
  });

  const addRole = async (role = NEW_ROLE) => {
    const settings = await utils.getSettings();
    settings.roles[role] = { name: NEW_ROLE, offline: true };
    Object.values(settings.permissions).forEach(roles => {
      if (roles.includes('chw')) {
        roles.push(NEW_ROLE);
      }
    });
    await utils.updateSettings(settings, true);
  };

  before(async () => {
    await utils.saveDocs([...places.values(), contact]);
    await addRole(NEW_ROLE);
    await utils.createUsers([user]);
  });

  after(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);
  });

  it('user with custom role should be able to log in', async () => {
    await loginPage.login({ username: user.username, password: user.password });
  });

  it('should be able to sync documents up', async () => {
    const report = genericReportFactory.report().build( { form: 'something', contact: { _id: contact._id } });
    await browserDbUtils.createDoc(report);
    await commonPage.sync();
    await utils.getDoc(report._id);
  });

  it('should be able to sync documents down', async () => {
    const report = genericReportFactory.report().build( { form: 'something', contact: { _id: contact._id } });
    await utils.saveDoc(report);
    await commonPage.sync();
    await browserDbUtils.getDoc(report._id);
  });
});
