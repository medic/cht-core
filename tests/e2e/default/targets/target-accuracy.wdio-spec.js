const path = require('path');
const moment = require('moment');
const chtConfUtils = require('@utils/cht-conf');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const compileConfig = async (tasksFileName, targetFileName) => {
  await chtConfUtils.initializeConfigDir();
  const tasksFilePath = path.join(__dirname, `config/${tasksFileName}`);
  const targetFilePath = path.join(__dirname, `config/${targetFileName}`);
  return await chtConfUtils.compileNoolsConfig({
    tasks: tasksFilePath,
    targets: targetFilePath,
  });
};

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const healthCenter = places.get('health_center');
const chwContact = personFactory.build({
  name: 'CHW',
  patient_id: 'CHW',
  reported_date: moment().subtract(3, 'months').valueOf(),
  parent: {
    _id: healthCenter._id,
    parent: healthCenter.parent
  },
});

const chw = userFactory.build({
  username: 'chw',
  isOffline: true,
  place: healthCenter._id,
  contact: chwContact._id,
});

const targetTag = moment().format('YYYY-MM');
const targetDocId = `target~${targetTag}~${chwContact._id}~org.couchdb.user:${chw.username}`;

describe('Target accuracy', () => {
  before(async () => {
    await utils.saveDocs([...places.values(), chwContact]);
    await utils.createUsers([chw]);
    const settings = await compileConfig(
      'target-accuracy-tasks.js',
      'target-accuracy-targets.js'
    );
    await utils.updateSettings(settings, { ignoreReload: 'api' });
    await loginPage.login(chw);
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should save target document on first calculation', async () => {
    await commonPage.goToPeople(chwContact._id);
    await browser.takeScreenshot();

    await commonPage.sync(false, 2000);
    const serverDoc = await utils.getDoc(targetDocId);

    expect(serverDoc._rev).to.match(/^1-/);
    expect(serverDoc.targets).to.deep.equal([{
      id: 'new-persons',
      value: {
        pass: 0,
        total: 0
      }
    }]);
  });

  it('should save target document when targets change', async () => {
    await commonPage.goToPeople();
    await contactsPage.addPerson({ name: 'Jody' }, false);
    await commonPage.waitForPageLoaded();

    await commonPage.sync(false, 2000);
    const serverDoc = await utils.getDoc(targetDocId);

    expect(serverDoc._rev).to.match(/^2-/);
    expect(serverDoc.targets).to.deep.equal([{
      id: 'new-persons',
      value: {
        pass: 1,
        total: 1
      }
    }]);
  });

  it('should not save target document when editing counted contact', async () => {
    await commonPage.goToPeople();
    await contactsPage.editPersonName('Jody', 'Jody Ash');
    await commonPage.waitForPageLoaded();

    await commonPage.sync(false, 2000);
    const serverDoc = await utils.getDoc(targetDocId);
    expect(serverDoc._rev).to.match(/^2-/);
  });

  it('should not save target document when adding report for counted contact', async () => {
    await commonPage.goToPeople();
    await contactsPage.selectLHSRowByText('Jody Ash');
    await commonPage.waitForPageLoaded();
    await commonPage.openFastActionReport('death_report');

    await commonEnketoPage.selectRadioButton('Place of death', 'Health facility');
    await commonEnketoPage.setDateValue('Date of Death', moment().subtract(1, 'week').format('YYYY-MM-DD'));
    await genericForm.nextPage();
    await genericForm.submitForm();

    await contactsPage.selectLHSRowByText('Jody Ash');
    await commonPage.waitForPageLoaded();

    await commonPage.sync(false, 2000);
    const serverDoc = await utils.getDoc(targetDocId);
    expect(serverDoc._rev).to.match(/^2-/);
  });

  it('should save target document when deleting counted contact', async () => {
    await commonPage.goToPeople();
    await contactsPage.selectLHSRowByText('Jody Ash', true, false);
    await contactsPage.deletePerson();

    await commonPage.waitForPageLoaded();

    await browser.pause(1500); // wait for debounced calculation
    await commonPage.sync(false, 2000);

    const serverDoc = await utils.getDoc(targetDocId);
    expect(serverDoc._rev).to.match(/^3-/);

    expect(serverDoc.targets).to.deep.equal([{
      id: 'new-persons',
      value: {
        pass: 0,
        total: 0
      }
    }]);
  });

  it('should save target doc once when getting many changes through replication', async () => {
    const parent = { parent: { _id: clinic._id, parent: clinic.parent } };
    const contacts = Array.from({ length: 20 }).map(() => personFactory.build(parent));
    await utils.saveDocs(contacts);

    await commonPage.sync(false, 2000);
    await browser.pause(1500); // wait for debounced calculation

    const serverDoc = await utils.getDoc(targetDocId);
    expect(serverDoc._rev).to.match(/^4-/);

    expect(serverDoc.targets).to.deep.equal([{
      id: 'new-persons',
      value: {
        pass: contacts.length,
        total: contacts.length
      }
    }]);
  });

  it('should only create one target doc', async () => {
    const docs = await utils.db.allDocs({ startkey: 'target', endkey: 'target\ufff0' });
    expect(docs.rows.length).to.equal(1);
  });
});
