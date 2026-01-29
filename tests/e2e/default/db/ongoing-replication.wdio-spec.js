const _ = require('lodash');
const utils = require('@utils');
const chtDbUtils = require('@utils/cht-db');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const path = require('path');
const chtConfUtils = require('@utils/cht-conf');
const { DOC_IDS, DOC_TYPES } = require('@medic/constants');

describe('ongoing replication', function() {
  const userAllowedDocs = dataFactory.createHierarchy({ name: 'base', user: true, nbrClinics: 2 });
  const userDeniedDocs = dataFactory.createHierarchy({ name: 'other', nbrClinics: 2 });

  let additionalAllowed;
  let additionalDenied;

  const saveData = async (hierarchy) => {
    await utils.saveDocs([...hierarchy.clinics, ...hierarchy.persons, ...hierarchy.reports]);
  };

  this.timeout(4 * 60 * 1000); // Sometimes the tests take longer to complete than the original 2 minutes timeout.

  before(async () => {
    await utils.updatePermissions(
      userAllowedDocs.user.roles,
      [],
      ['can_view_tasks', 'can_view_analytics'],
      { ignoreReload: true }
    );
    await utils.saveDocs([...userAllowedDocs.places, ...userDeniedDocs.places]);
    await utils.createUsers([userAllowedDocs.user]);

    await saveData(userAllowedDocs);
    await saveData(userDeniedDocs);
  });

  after(async () => {
    await utils.toggleSentinelTransitions();
    await sentinelUtils.skipToSeq();
    await utils.toggleSentinelTransitions();
    await utils.deleteUsers([userAllowedDocs.user]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await browser.throttle('online');
  });

  it('should download new documents ', async () => {
    await loginPage.login(userAllowedDocs.user);

    const localAllDocsPreSync = await chtDbUtils.getDocs();
    const localDocIdsPreSync = dataFactory.ids(localAllDocsPreSync);

    expect(localDocIdsPreSync).to.include.members(dataFactory.ids(userAllowedDocs.clinics));
    expect(localDocIdsPreSync).to.include.members(dataFactory.ids(userAllowedDocs.persons));
    expect(localDocIdsPreSync).to.include.members(dataFactory.ids(userAllowedDocs.reports));

    await browser.throttle('offline');

    additionalAllowed = dataFactory.createData({
      healthCenter: userAllowedDocs.healthCenter,
      user: userAllowedDocs.user
    });
    additionalDenied = dataFactory.createData({
      healthCenter: userDeniedDocs.healthCenter,
      nbrClinics: 2,
      nbrPersons: 2,
    });

    await saveData(additionalAllowed);
    await saveData(additionalDenied);

    await browser.throttle('online');
    await commonPage.sync({ expectReload: true, timeout: 30000 });

    const localDocsPostSync = await chtDbUtils.getDocs();
    const localDocIds = dataFactory.ids(localDocsPostSync);

    expect(localDocIds).to.include.members(dataFactory.ids(userAllowedDocs.clinics));
    expect(localDocIds).to.include.members(dataFactory.ids(userAllowedDocs.persons));
    expect(localDocIds).to.include.members(dataFactory.ids(userAllowedDocs.reports));

    expect(localDocIds).to.include.members(dataFactory.ids(additionalAllowed.clinics));
    expect(localDocIds).to.include.members(dataFactory.ids(additionalAllowed.persons));
    expect(localDocIds).to.include.members(dataFactory.ids(additionalAllowed.reports));

    const replicatedDeniedDocs = _.intersection(
      localDocIds,
      dataFactory.ids([...userDeniedDocs.clinics, ...userDeniedDocs.persons, ...userDeniedDocs.reports]),
      dataFactory.ids([...additionalDenied.clinics, ...additionalDenied.persons, ...additionalDenied.reports]),
    );
    expect(replicatedDeniedDocs).to.deep.equal([]);
  });

  it('should handle updates to existing documents', async () => {
    await browser.throttleNetwork('offline');

    const serverDocs = await utils.getDocs(dataFactory.ids(userAllowedDocs.reports));
    serverDocs.forEach(doc => doc.updated = 'yes');
    await utils.saveDocs(serverDocs);

    await browser.throttleNetwork('online');
    await commonPage.sync();

    const localDocs = await chtDbUtils.getDocs(dataFactory.ids(userAllowedDocs.reports), { include_docs: true });
    expect(localDocs.every(doc => doc.doc.updated === 'yes')).to.equal(true);
  });

  it('should download new forms and update forms', async () => {
    const FORM_ID = 'form:dummy';
    const waitForForms = await utils.formDocProcessing({ _id: FORM_ID });
    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
    await waitForForms.promise();

    await commonPage.sync();
    const form = await chtDbUtils.getDoc(FORM_ID);
    expect(form._attachments).to.have.keys('xml', 'form.html', 'model.xml');

    const serverForm = await utils.getDoc(FORM_ID);
    serverForm.updated = true;
    await utils.saveDoc(serverForm);

    await commonPage.sync();

    const updatedForm = await chtDbUtils.getDoc(FORM_ID);
    expect(updatedForm.updated).to.equal(serverForm.updated);
  });

  it('should download new languages and language updates', async () => {
    let waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await utils.addTranslations('rnd', {});
    await waitForServiceWorker.promise;

    await commonPage.sync({ expectReload: true, reload: true, serviceWorkerUpdate: true });
    const rnd = await chtDbUtils.getDoc('messages-rnd');
    expect(rnd).to.include({
      type: DOC_TYPES.TRANSLATIONS,
      code: 'rnd',
      _id: 'messages-rnd'
    });
    rnd.updated = 'yeaaaa';
    waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await utils.saveDoc(rnd);
    await waitForServiceWorker.promise;

    await commonPage.sync({ expectReload: true, reload: true, serviceWorkerUpdate: true });
    const updatedRnd = await chtDbUtils.getDoc('messages-rnd');
    expect(updatedRnd.updated).to.equal(rnd.updated);
  });

  it('should download settings updates', async () => {
    await commonPage.sync();
    await utils.updateSettings({ test: true }, { ignoreReload: 'api' });
    await commonPage.sync({ expectReload: true, reload: true });
    const settings = await chtDbUtils.getDoc(DOC_IDS.SETTINGS);
    expect(settings.settings.test).to.equal(true);
  });

  it('should handle deletes', async () => {
    await commonPage.sync();
    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    const docIdsToDelete = [
      'form:dummy',
      ...dataFactory.ids(userAllowedDocs.reports),
      ...dataFactory.ids(additionalAllowed.reports).slice(0, 10),
      'messages-rnd'
    ];
    await utils.deleteDocs(docIdsToDelete);
    await waitForServiceWorker.promise;

    await commonPage.sync({ expectReload: true, reload: true, serviceWorkerUpdate: true });
    const localDocsPostSync = await chtDbUtils.getDocs();
    const localDocIds = dataFactory.ids(localDocsPostSync);

    expect(_.intersection(localDocIds, docIdsToDelete)).to.deep.equal([]);
  });

  it('should handle conflicts', async () => {
    const docs = dataFactory.createData({
      healthCenter: userAllowedDocs.healthCenter,
      user: userAllowedDocs.user,
      nbrPersons: 1,
      nbrClinics: 1,
    });
    await chtDbUtils.createDocs([...docs.clinics, ...docs.persons, ...docs.reports]);

    await commonPage.sync();

    const docId = docs.persons[0]._id;
    //create conflict
    await browser.throttleNetwork('offline');
    await chtDbUtils.updateDoc(docId, { local_update: 1 });
    await chtDbUtils.updateDoc(docId, { local_update: 2 });
    let serverDoc = await utils.getDoc(docId);
    serverDoc.remote_update = 1;
    await utils.saveDoc(serverDoc);

    await browser.throttleNetwork('online');
    await commonPage.sync();

    let localDoc = await chtDbUtils.getDoc(docId);
    // only get winning revs from server
    expect(localDoc._conflicts).to.be.undefined;
    expect(localDoc.local_update).to.equal(2);

    await browser.throttleNetwork('offline');
    await chtDbUtils.updateDoc(docId, { local_update: 3 });
    serverDoc = await utils.getDoc(docId);
    serverDoc.remote_update = 2;
    await utils.saveDoc(serverDoc);

    serverDoc = await utils.getDoc(docId);
    serverDoc.remote_update = 3;
    await utils.saveDoc(serverDoc);

    await browser.throttleNetwork('online');
    await commonPage.sync();

    localDoc = await chtDbUtils.getDoc(docId);
    // only get winning revs from server
    expect(localDoc._conflicts.length).to.equal(1);
    expect(localDoc.local_update).to.equal(2);
    expect(localDoc.remote_update).to.equal(3);
  });
});

