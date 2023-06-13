const Faker = require('@faker-js/faker').faker;
const _ = require('lodash');

const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const chtDbUtils = require('@utils/cht-db');
const sentinelUtils = require('@utils/sentinel');

const MIGRATION_FLAG_ID = '_local/migration-checkpointer';

const setupUser = () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const contact = personFactory.build({
    name: Faker.name.firstName(),
    parent: { _id: districtHospital._id },
  });
  const user = userFactory.build({
    username: Faker.internet.userName().toLowerCase().replace(/[^0-9a-zA-Z_]/g, ''),
    password: 'Secret_1',
    place: districtHospital._id,
    contact: contact._id,
    known: true,
  });
  const healthCenters = Array
    .from({ length: 10 })
    .map(() => placeFactory.place().build({
      type: 'health_center',
      parent: { _id: districtHospital._id },
      name: Faker.name.firstName(),
    }));

  return {
    docs: [
      ...places.values(),
      ...healthCenters,
      contact,
    ],
    user,
  };
};

const getLocalDocsIds = async () => {
  const result = await utils.requestOnTestDb('/_local_docs');
  const ids = result.rows.map(row => row.id);
  return ids;
};

const getLocalDocs = async (ids) => {
  const result = await utils.requestOnTestDb({
    path: '/_local_docs',
    qs: {
      keys: JSON.stringify(ids),
      include_docs: true,
    }
  });
  return result.rows.map(row => row.doc);
};

const loginAndGetCheckpointerDocs = async (user) => {
  const localDocIdsSnapshot = await getLocalDocsIds();

  await loginPage.login(user);
  await commonPage.sync();

  const localDocIds = await getLocalDocsIds();
  const checkpointerDocIds = _.difference(localDocIds, localDocIdsSnapshot);

  expect(checkpointerDocIds.length).to.equal(2);

  return await getLocalDocs(checkpointerDocIds);
};

describe('Storing checkpointer on target migration', () => {
  let user;
  let docs;

  beforeEach(async () => {
    ({ docs, user } = setupUser());
    await utils.saveDocs(docs);
    await utils.createUsers([user]);
    await sentinelUtils.waitForSentinel();
  });

  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');

    await utils.deleteUsers([user]);
    await utils.revertDb([], true);
  });

  it('should store replication checkpointers on target and source', async () => {
    const checkpointerDocs = await loginAndGetCheckpointerDocs(user);

    for (const checkpointerDoc of checkpointerDocs) {
      const browserCheckpointer = await chtDbUtils.getDoc(checkpointerDoc._id);
      expect(browserCheckpointer).excludingEvery('_rev').to.deep.equal(checkpointerDoc);
    }

    // expect migration to have run
    await chtDbUtils.getDoc(MIGRATION_FLAG_ID);

    // subsequent syncs don't trigger _revs_diffs calls
    const captureLogs = await utils.collectApiLogs(/_revs_diff/);
    await commonPage.sync();
    await commonPage.refresh();
    await commonPage.sync();
    const revDiffCalls = await captureLogs();
    expect(revDiffCalls.length).to.equal(0);
  });

  it('should copy existent browser checkpointer when db is not migrated', async () => {
    const checkpointerDocs = await loginAndGetCheckpointerDocs(user);

    const replicateToDoc = checkpointerDocs.find(doc => typeof doc.last_seq === 'number');

    await browser.throttle('offline');

    await utils.deleteDoc(replicateToDoc._id);
    await chtDbUtils.deleteDoc(MIGRATION_FLAG_ID);

    const captureLogs = await utils.collectApiLogs(/medic\/_revs_diff/);

    await browser.throttle('online');
    await commonPage.refresh();
    await commonPage.sync();

    // migration doc created again
    await chtDbUtils.getDoc(MIGRATION_FLAG_ID);
    // checkpointer doc exists on the server again
    const replicateToDocServer = await utils.getDoc(replicateToDoc._id);
    const replicateToDocBrowser = await chtDbUtils.getDoc(replicateToDoc._id);
    expect(replicateToDocBrowser).excludingEvery('_rev').to.deep.equal(replicateToDocServer);

    const revDiffCalls = await captureLogs();
    expect(revDiffCalls.length).to.equal(0);
  });

  it('should not flag migration as ran if the browser was offline', async () => {
    await loginPage.login(user);

    await expect(chtDbUtils.getDoc(MIGRATION_FLAG_ID)).to.be.rejectedWith({ status: 404 });

    await browser.throttle('offline');
    await commonPage.syncAndWaitForFailure();
    await commonPage.refresh();
    await commonPage.syncAndWaitForFailure();
    await commonPage.refresh();
    await commonPage.syncAndWaitForFailure();

    await expect(chtDbUtils.getDoc(MIGRATION_FLAG_ID)).to.be.rejectedWith({ status: 404 });

    await browser.throttle('online');
    await commonPage.refresh();
    await commonPage.sync();

    await chtDbUtils.getDoc(MIGRATION_FLAG_ID);
  });

  it('should re-upload docs when the server rolls back', async () => {
    const checkpointerDocs = await loginAndGetCheckpointerDocs(user);
    const replicateToDoc = checkpointerDocs.find(doc => typeof doc.last_seq === 'number');

    await chtDbUtils.getDoc(MIGRATION_FLAG_ID);
    const localInfo = await chtDbUtils.info();

    const newContact = personFactory.build({
      name: Faker.name.firstName(),
      parent: { _id: user.place },
    });
    await chtDbUtils.createDoc(newContact);
    await commonPage.sync();

    const serverContact = await utils.db.get(newContact._id);

    await browser.throttle('offline');

    // delete last history from the checkpointer doc
    const serverCheckpointer = await utils.db.get(replicateToDoc._id);
    const historyIdx = serverCheckpointer.history.findIndex(el => el.last_seq <= localInfo.update_seq);
    serverCheckpointer.history.splice(0, historyIdx);
    serverCheckpointer.last_seq = serverCheckpointer.history[0].last_seq;
    serverCheckpointer.session_id = serverCheckpointer.history[0].session_id;
    await utils.db.put(serverCheckpointer);
    // purge document
    await utils.requestOnTestDb({
      path: '/_purge',
      method: 'POST',
      body: {
        [serverContact._id]: [serverContact._rev],
      }
    });

    const captureLogs = await utils.collectApiLogs(/medic\/_bulk_docs/, /medic\/_revs_diff/);

    await browser.throttle('online');
    await commonPage.sync();
    const replicatonCalls = await captureLogs();
    expect(replicatonCalls.length).to.equal(6);

    await utils.db.get(serverContact._id);
  });
});

