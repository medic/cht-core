const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');
const sentinelUtils = require('@utils/sentinel');

/* global window */

describe('purge', function () {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const contact = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const user = userFactory.build({ username: 'offlineuser-purge', place: healthCenter._id });

  const filterPurgeReports = (userCtx, contact, reports) => {
    return reports.filter(r => r.form === 'purge').map(r => r._id);
  };

  const filterHomeVisitReports = (userCtx, contact, reports) => {
    return reports.filter(r => r.form === 'home_visit').map(r => r._id);
  };

  const filterByCht = (userCtx, contact, reports, messages, chtScript, settings) => {
    if (chtScript.v1.hasPermissions('can_export_messages', userCtx.roles, settings)) {
      return reports.filter(r => r.form === 'purge').map(r => r._id);
    }
    return reports.map(r => r._id);
  };

  const generateReports = (reportsLength, formName) => Array
    .from({ length: reportsLength })
    .map(() => genericReportFactory.report().build({ form: formName }, { patient, submitter: contact }));

  const reportsToPurge = generateReports(50, 'purge');

  const homeVisits = generateReports(125, 'home_visit');

  const pregnancies = generateReports(125, 'pregnancy');

  const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

  const getAllReports = () => browser.executeAsync(callback => {
    window.CHTCore.DB
      .get()
      .allDocs({ include_docs: true })
      .then(results => results.rows.map(row => row.doc).filter(doc => doc.type === 'data_record'))
      .then(callback)
      .catch(callback);
  });

  const updatePurgeSettings = async (purgeFn, revert) => {
    const settings = { purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds', run_every_days: -1 } };
    await utils.updateSettings(settings, { revert: revert, ignoreReload: true });
  };

  const runPurging = async () => {
    const seq = await sentinelUtils.getCurrentSeq();
    await restartSentinel();
    await sentinelUtils.waitForPurgeCompletion(seq);
    await utils.delayPromise(1000);  // API has to pick up on purging completing
  };

  this.timeout(2 * 120000); //sometimes test takes a little longer than original timeout

  afterEach(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);

    await browser.reloadSession();
    await browser.url('/');
  });

  it('purging runs on sync', async () => {
    await updatePurgeSettings(filterPurgeReports); // settings should be at the beginning of the changes feed

    await utils.saveDocs([...places.values(), contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs(reportsToPurge);
    await utils.saveDocs(homeVisits);
    await utils.saveDocs(pregnancies);
    await sentinelUtils.waitForSentinel();

    await runPurging();

    await loginPage.login(user);

    let allReports = await getAllReports();
    expect(allReports.length).to.equal(homeVisits.length + pregnancies.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['purge']);

    await updatePurgeSettings(filterHomeVisitReports, true);
    await runPurging();

    await commonElements.sync(true);

    allReports = await getAllReports();
    // this only works because the client didn't have to "purge" these docs and the revs didn't have
    // to be overwritten
    expect(allReports.length).to.equal(pregnancies.length + reportsToPurge.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['home_visit']);
  });

  it('purging runs when using chtScriptApi', async () => {
    await updatePurgeSettings(filterByCht); // settings should be at the beginning of the changes feed

    await utils.saveDocs([...places.values(), contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs(reportsToPurge);
    await utils.saveDocs(homeVisits);
    await utils.saveDocs(pregnancies);
    await sentinelUtils.waitForSentinel();

    await runPurging();

    await loginPage.login(user);

    await commonElements.sync();
    const allReports = await getAllReports();
    expect(allReports.length).to.equal(homeVisits.length + pregnancies.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['purge']);
  });
});
