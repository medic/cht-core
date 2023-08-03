const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');
const sentinelUtils = require('@utils/sentinel');

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

const purgeUsingChtApitFn = (userCtx, contact, reports, messages, chtScript, settings) => {
  if (chtScript.v1.hasPermissions('can_export_messages', userCtx.roles, settings)) {
    return reports.filter(r => r.form === 'purge').map(r => r._id);
  }
  return reports.map(r => r._id);
};

const reportsToPurge = Array
  .from({ length: 50 })
  .map(() => genericReportFactory.report().build({ form: 'purge' }, { patient, submitter: contact }));
const homeVisits = Array
  .from({ length: 125 })
  .map(() => genericReportFactory.report().build({ form: 'home_visit' }, { patient, submitter: contact }));
const pregnancies = Array
  .from({ length: 125 })
  .map(() => genericReportFactory.report().build({ form: 'pregnancy' }, { patient, submitter: contact }));

const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

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
  await utils.delayPromise(1000);  // API has to pick up on purging completing
};

describe('purge', function() {
  this.timeout(2 * 120000); //sometimes test takes a little longer than original timeout

  afterEach(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);

    await browser.reloadSession();
    await browser.url('/');
  });

  it('purging runs on sync', async () => {
    await updateSettings(purgeFn); // settings should be at the beginning of the changes feed

    await utils.saveDocs([district, healthCenter, contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs(reportsToPurge);
    await utils.saveDocs(homeVisits);
    await utils.saveDocs(pregnancies);
    await sentinelUtils.waitForSentinel();

    await runPurging();

    await loginPage.login({ username: user.username, password: user.password, loadPage: true });

    //await commonElements.sync();
    let allReports = await getAllReports();
    expect(allReports.length).to.equal(homeVisits.length + pregnancies.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['purge']);

    await updateSettings(purgeHomeVisitFn, true);
    await runPurging();

    await commonElements.sync(true);

    allReports = await getAllReports();
    // this only works because the client didn't have to "purge" these docs and the revs didn't have
    // to be overwritten
    expect(allReports.length).to.equal(pregnancies.length + reportsToPurge.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['home_visit']);
  });

  it('purging runs when using chtScriptApi', async () => {
    await updateSettings(purgeUsingChtApitFn); // settings should be at the beginning of the changes feed

    await utils.saveDocs([district, healthCenter, contact, patient]);
    await utils.createUsers([user]);
    await utils.saveDocs(reportsToPurge);
    await utils.saveDocs(homeVisits);
    await utils.saveDocs(pregnancies);
    await sentinelUtils.waitForSentinel();

    await runPurging();

    await loginPage.login({ username: user.username, password: user.password, loadPage: true });

    await commonElements.sync();
    const allReports = await getAllReports();
    expect(allReports.length).to.equal(homeVisits.length + pregnancies.length);
    expect(allReports.map(r => r.form)).to.not.have.members(['purge']);
  });
});
