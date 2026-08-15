const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');
const { CONTACT_TYPES } = require('@medic/constants');

/* global window */

describe('archive', function () {
  this.timeout(2 * 120000);

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const contact = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const user = userFactory.build({ username: 'offlineuser-archive', place: healthCenter._id });
  // Built per test: re-archiving an id the archive db has already seen (and cleanup deleted)
  // would be a silent new_edits:false no-op against the deletion tombstone, since identical
  // content re-mints the identical rev. A fresh report id per test avoids the collision.
  let reportToArchive;

  const postCsv = (csv) => utils.request({
    path: '/api/v1/archive',
    method: 'POST',
    body: csv,
    headers: { 'Content-Type': 'text/csv' },
  });

  const getLocalDoc = (id) => browser.executeAsync((docId, done) => {
    window.CHTCore.DB
      .get()
      .get(docId)
      .then(doc => done({ ok: true, doc }))
      .catch(err => done({ ok: false, status: err.status }));
  }, id);

  before(async () => {
    reportToArchive = genericReportFactory
      .report()
      .build({ form: 'home_visit' }, { patient, submitter: contact });
    await utils.saveDocs([...places.values(), contact, patient, reportToArchive]);
    await utils.createUsers([user]);
    await loginPage.login(user);
  });

  const archiveReport = async (report) => {
    const { jobs } = await postCsv(report._id);
    expect(jobs).to.have.lengthOf(1);

    await utils.updateSettings({ archive: { text_expression: 'every 1 seconds' } }, { ignoreReload: true });
    await utils.runSentinelTasks();
    await sentinelUtils.waitForArchiveCompletion();
  };

  // revertDb only covers medic — archived copies would leak between tests otherwise.
  // Deleting leaves tombstones behind, which is safe only because every test archives a
  // freshly built report id (see reportToArchive) and never re-archives a tombstoned rev.
  const cleanArchiveDb = async () => {
    const { rows } = await utils.archiveDb.allDocs();
    const deletes = rows.map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
    await utils.archiveDb.bulkDocs(deletes);
  };

  after(async () => {
    await cleanArchiveDb();
  });

  it('removes an archived doc from the offline user device on the next sync', async () => {
    // Confirm the report replicated to the user's device before archiving.
    let local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(true);
    expect(local.doc.form).to.equal('home_visit');

    // Kick off the archive flow on the server.
    await archiveReport(reportToArchive);

    const serverRows = await utils.db.allDocs({ keys: [reportToArchive._id] });
    expect(serverRows.rows[0].error).to.equal('not_found');

    await commonElements.sync();

    local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(false);
    expect(local.status).to.equal(404);
  });

  it('restores an unarchived doc to the offline user device on the next sync', async () => {
    // Unarchive: restore the doc into medic AND remove it from the archive db.
    const archived = await utils.archiveDb.get(reportToArchive._id);
    const restored = { ...archived };
    delete restored._rev;
    delete restored.archive_date;
    // Restore as a two-write edit chain. Writing the identical content once would mint
    // the exact gen-1 rev the client already holds as its tombstone's parent, so the
    // client's new_edits:false download would be a no-op and the doc would stay deleted
    // on the device. The second write bumps the server doc to a gen-2 live rev the
    // client has never seen — it lands as a live branch that wins over the tombstone.
    const [firstWrite] = await utils.saveDocs([restored]);
    expect(firstWrite.ok).to.equal(true);
    await utils.saveDocs([{ ...restored, _rev: firstWrite.rev }]);
    await utils.archiveDb.remove(archived._id, archived._rev);

    await commonElements.sync();

    // The doc is back on the device with its original content...
    const local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(true);
    expect(local.doc.form).to.equal('home_visit');
    expect(local.doc.fields).to.deep.equal(reportToArchive.fields);
    expect(local.doc.archive_date).to.equal(undefined);

    await commonElements.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.leftPanelSelectors.firstReport());
    expect(firstReport.dataId).to.equal(reportToArchive._id);
  });
});
