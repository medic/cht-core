const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const loginPage = require('@page-objects/default/login/login.wdio.page');
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

  before(async () => {
    await utils.saveDocs([...places.values(), contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs([reportToArchive]);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);
    await commonElements.reloadSession();
  });

  it('leaves an archived doc on the offline user device — purge does not propagate', async () => {
    await loginPage.login(user);

    // Confirm the report replicated to the user's device before archiving.
    let local = await getLocalDoc(reportToArchive._id);
    expect(local.ok).to.equal(true);
    expect(local.doc.form).to.equal('home_visit');

    // Kick off the archive flow on the server.
    const { jobs } = await postCsv(reportToArchive._id);
    expect(jobs).to.have.lengthOf(1);

    await utils.updateSettings({ archive: { text_expression: 'every 1 seconds' } }, { ignoreReload: true });
    await utils.runSentinelTasks();
    await sentinelUtils.waitForArchiveCompletion();

    const serverRows = await utils.db.allDocs({ keys: [reportToArchive._id] });
    expect(serverRows.rows[0].error).to.equal('not_found');

    await commonElements.sync();

    local = await getLocalDoc(reportToArchive._id);
    expect(local.ok, 'archived doc must still be on the offline device after sync').to.equal(true);
    expect(local.doc._id).to.equal(reportToArchive._id);
    expect(local.doc.form).to.equal('home_visit');
  });
});
