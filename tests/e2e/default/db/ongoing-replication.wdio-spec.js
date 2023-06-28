const _ = require('lodash');

const utils = require('@utils');
const browserUtils = require('@utils/browser');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const data = require('./data');
const path = require('path');
const chtConfUtils = require('@utils/cht-conf');

const userAllowedDocs = data.createHierarchy({ name: 'base', user: true, nbrClinics: 2 });
const userDeniedDocs = data.createHierarchy({ name: 'other', nbrClinics: 2 });

let additionalAllowed;
let additionalDenied;

const saveData = async (hierarchy) => {
  await utils.saveDocs(hierarchy.clinics);
  await utils.saveDocs(hierarchy.persons);
  await utils.saveDocs(hierarchy.reports);
};

describe('ongoing replication', () => {
  before(async () => {
    // we're creating ~2000 docs
    await utils.saveDocs([...userAllowedDocs.places, ...userDeniedDocs.places]);
    await utils.createUsers([userAllowedDocs.user]);

    await sentinelUtils.waitForSentinel();
    // await utils.stopSentinel();

    await saveData(userAllowedDocs);
    await saveData(userDeniedDocs);

    await loginPage.login(userAllowedDocs.user);
  });

  after(async () => {
    await sentinelUtils.skipToSeq();
    // await utils.startSentinel();
  });

  it('should download new documents ', async () => {
    const localAllDocsPreSync = await browserUtils.getDocs();
    const localDocIdsPreSync = data.ids(localAllDocsPreSync);

    expect(localDocIdsPreSync).to.include.members(data.ids(userAllowedDocs.clinics));
    expect(localDocIdsPreSync).to.include.members(data.ids(userAllowedDocs.persons));
    expect(localDocIdsPreSync).to.include.members(data.ids(userAllowedDocs.reports));

    await browser.throttle('offline');

    additionalAllowed = data.createData({ healthCenter: userAllowedDocs.healthCenter, user: userAllowedDocs.user });
    additionalDenied = data.createData({
      healthCenter: userDeniedDocs.healthCenter,
      nbrClinics: 2,
      nbrPersons: 2,
    });

    await saveData(additionalAllowed);
    await saveData(additionalDenied);

    await browser.throttle('online');
    await commonPage.sync(false, 30000);

    const localDocsPostSync = await browserUtils.getDocs();
    const localDocIds = data.ids(localDocsPostSync);

    expect(localDocIds).to.include.members(data.ids(userAllowedDocs.clinics));
    expect(localDocIds).to.include.members(data.ids(userAllowedDocs.persons));
    expect(localDocIds).to.include.members(data.ids(userAllowedDocs.reports));

    expect(localDocIds).to.include.members(data.ids(additionalAllowed.clinics));
    expect(localDocIds).to.include.members(data.ids(additionalAllowed.persons));
    expect(localDocIds).to.include.members(data.ids(additionalAllowed.reports));

    const replicatedDeniedDocs = _.intersection(
      localDocIds,
      data.ids([...userDeniedDocs.clinics, ...userDeniedDocs.persons, ...userDeniedDocs.reports]),
      data.ids([...additionalDenied.clinics, ...additionalDenied.persons, ...additionalDenied.reports]),
    );
    expect(replicatedDeniedDocs).to.deep.equal([]);
  });

  it('should handle updates to existing documents', async () => {
    await browser.throttle('offline');

    const serverDocs = await utils.getDocs(data.ids(userAllowedDocs.reports));
    serverDocs.forEach(doc => doc.updated = 'yes');
    await utils.saveDocs(serverDocs);

    await browser.throttle('online');
    await commonPage.sync();

    const localDocs = await browserUtils.getDocs(data.ids(userAllowedDocs.reports));
    expect(localDocs.every(doc => doc.updated === 'yes')).to.equal(true);
  });

  it('should download new forms and update forms', async () => {
    const formId = 'form:dummy';
    const waitForForms = await utils.formDocProcessing({ _id: formId });
    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
    await waitForForms.promise();

    await commonPage.sync();
    const [form] = await browserUtils.getDocs([formId]);
    expect(form._attachments).to.have.keys('xml', 'form.html', 'model.xml');

    form.updated = true;
    await utils.saveDoc(form);

    await commonPage.sync();

    const [updatedForm] = await browserUtils.getDocs([formId]);
    expect(updatedForm.updated).to.equal(form.updated);
  });

  it('should download new languages and language updates', async () => {
    let waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await utils.addTranslations('rnd', {});
    await waitForServiceWorker.promise;

    await commonPage.sync(true);
    const [rnd] = await browserUtils.getDocs(['messages-rnd']);
    expect(rnd).to.include({
      type: 'translations',
      code: 'rnd',
      _id: 'messages-rnd'
    });
    rnd.updated = 'yeaaaa';
    waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await utils.saveDoc(rnd);
    await waitForServiceWorker.promise;

    await commonPage.sync(true);
    const [updatedRnd] = await browserUtils.getDocs(['messages-rnd']);
    expect(updatedRnd.updated).to.equal(rnd.updated);
  });

  it('should handle deletes', async () => {
    await commonPage.sync();
    await browser.throttle('offline');
    const docIdsToDelete = [
      'form:dummy',
      ...data.ids(userAllowedDocs.reports),
      ...data.ids(additionalAllowed.reports).slice(0, 10),
      'messages-rnd'
    ];
    await utils.deleteDocs(docIdsToDelete);
    await sentinelUtils.waitForSentinel();

    await browser.throttle('online');
    await commonPage.sync();
    const localDocsPostSync = await browserUtils.getDocs();
    const localDocIds = data.ids(localDocsPostSync);

    expect(_.intersection(localDocIds, docIdsToDelete)).to.deep.equal([]);
  });

  it('should download settings updates', async () => {
    await browser.throttle('offline');
    await utils.updateSettings({ test: true }, 'api');
    await browser.throttle('online');
    await commonPage.sync(true);
    const [settings] = await browserUtils.getDocs(['settings']);
    expect(settings.settings.test).to.equal(true);

    await browser.throttle('offline');
    await utils.revertSettings(true);
    await browser.throttle('online');
    await commonPage.sync(true);
  });
});

