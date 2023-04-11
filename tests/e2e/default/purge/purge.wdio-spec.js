const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');
const sentinelUtils = require('@utils/sentinel');

const PURGE_BATCH_SIZE = 100;

/* global window */

const district = placeFactory.place().build({
  _id: 'district',
  type: 'district_hospital',
});
const healthCenter = placeFactory.place().build({
  _id: 'health_center',
  type: 'health_center',
  parent: { _id: 'district' },
});
const contact = personFactory.build({
  _id: 'contact',
  type: 'person',
  name: 'offlineuser',
  parent: { _id: 'health_center', parent: { _id: 'district' } },
});
const patient = personFactory.build({
  _id: 'person',
  type: 'person',
  name: 'patient',
  patient_id: 'the_patient_id',
  parent: { _id: 'health_center', parent: { _id: 'district' } },
});
const user = userFactory.build({ username: 'offlineuser-purge', place: 'health_center' });

const purgeFn = (userCtx, contact, reports) => {
  return reports.filter(r => r.form === 'purge').map(r => r._id);
};

const purgeHomeVisitFn = (userCtx, contact, reports) => {
  return reports.filter(r => r.form === 'home_visit').map(r => r._id);
};

const reportsToPurge = Array
  .from({ length: 50 })
  .map(() => genericReportFactory.build({ form: 'purge' }, { patient, submitter: contact }));
const homeVisits = Array
  .from({ length: 125 })
  .map(() => genericReportFactory.build({ form: 'home_visit' }, { patient, submitter: contact }));
const pregnancies = Array
  .from({ length: 125 })
  .map(() => genericReportFactory.build({ form: 'pregnancy' }, { patient, submitter: contact }));

const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

const getPurgeLog = () => browser.executeAsync(callback => {
  window.CHTCore.DB
    .get()
    .get('_local/purgelog')
    .then(doc => callback(doc))
    .catch(err => callback(err));
});

const getAllReports = () => browser.executeAsync(callback => {
  window.CHTCore.DB
    .get()
    .allDocs({ include_docs: true })
    .then(results => results.rows.map(row => row.doc).filter(doc => doc.type === 'data_record'))
    .then(callback)
    .catch(callback);
});

const updateSettings = async (purgeFn, revert) => {
  if (revert) {
    await utils.revertSettings(true);
  }
  const settings = { purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds', run_every_days: -1 } };
  await utils.updateSettings(settings, true);
};

const runPurging = async () => {
  const seq = await sentinelUtils.getCurrentSeq();
  await restartSentinel();
  await sentinelUtils.waitForPurgeCompletion(seq);
};

const parsePurgingLogEntries = (logEntries) => {
  const re = /^REQ .* GET (\/purging[a-z/]*)/;
  return logEntries.map(entry => {
    const match = entry.match(re);
    return match && match[1];
  });
};

describe('purge', () => {
  it('purging runs on sync and startup', async () => {
    let purgeLog;

    await updateSettings(purgeFn); // settings should be at the beginning of the changes feed

    await utils.saveDocs([district, healthCenter, contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs(reportsToPurge);
    await utils.saveDocs(homeVisits);
    await utils.saveDocs(pregnancies);
    await sentinelUtils.waitForSentinel();

    await runPurging();

    await loginPage.login({ username: user.username, password: user.password, loadPage: true });

    const purgingRequestsPromise = await utils.collectApiLogs(/REQ.*purging/);
    await commonElements.sync();
    const purgingRequests = parsePurgingLogEntries(await purgingRequestsPromise());
    expect(purgingRequests).to.deep.equal([
      '/purging/changes',
      '/purging/checkpoint',
    ]);

    let allReports = await getAllReports();
    expect(allReports.length).to.equal(homeVisits.length + pregnancies.length);
    expect(allReports.some(report => report.form === 'purge')).to.equal(false);

    // Purging occurs normally when refreshing
    await updateSettings(purgeHomeVisitFn, true);
    await runPurging();
    await browser.refresh(); // refresh to clear the purge once only flag
    await commonElements.waitForPageLoaded();

    await commonElements.sync(true); // get the new list of ids to purge
    purgeLog = await getPurgeLog();
    expect(purgeLog.to_purge.length).to.equal(homeVisits.length);

    await browser.refresh();
    await commonElements.waitForPageLoaded();

    allReports = await getAllReports();
    expect(allReports.length).to.equal(pregnancies.length);
    expect(allReports.every(report => report.form === 'pregnancy')).to.equal(true);

    purgeLog = await getPurgeLog();
    expect(purgeLog.count).to.equal(homeVisits.length - PURGE_BATCH_SIZE);
    expect(purgeLog.roles).to.equal(JSON.stringify(['chw']));
    expect(purgeLog.history.length).to.equal(3);
    expect(purgeLog.history[0].count).to.equal(homeVisits.length - PURGE_BATCH_SIZE);
    expect(purgeLog.history[1].count).to.equal(PURGE_BATCH_SIZE);
    expect(purgeLog.history[2].count).to.equal(0);
    expect(purgeLog.to_purge.length).to.equal(0); // queue is empty
  });
});
