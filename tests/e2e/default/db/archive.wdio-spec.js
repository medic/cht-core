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
  const reportToArchive = genericReportFactory
    .report()
    .build({ form: 'home_visit' }, { patient, submitter: contact });

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

  beforeEach(async () => {
    await utils.saveDocs([...places.values(), contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs([reportToArchive]);
  });

  const archiveReport = async (report) => {
    const { jobs } = await postCsv(report._id);
    expect(jobs).to.have.lengthOf(1);

    await utils.updateSettings({ archive: { text_expression: 'every 1 seconds' } }, { ignoreReload: true });
    await utils.runSentinelTasks();
    await sentinelUtils.waitForArchiveCompletion();
  };

  afterEach(async () => {
    await utils.revertSettings(true);
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);
    await commonElements.reloadSession();
  });

  it('removes an archived doc from the offline user device on the next sync', async () => {
    await loginPage.login(user);

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
    await loginPage.login(user);
    await archiveReport(reportToArchive);
    await commonElements.sync();

    // Confirm the archived report is gone from the device before unarchiving.
    let local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(false);

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
    local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(true);
    expect(local.doc.form).to.equal('home_visit');
    expect(local.doc.fields).to.deep.equal(reportToArchive.fields);
    expect(local.doc.archive_date).to.equal(undefined);

    await commonElements.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.leftPanelSelectors.firstReport());
    expect(firstReport.dataId).to.equal(reportToArchive._id);
  });
});
