const commonElements = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const chtDbUtils = require('@utils/cht-db');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const userSettings = require('@factories/cht/users/user-settings');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');
const uuid = require('uuid').v4;

/* global window */

describe('db-sync', () => {
  const restrictedUserName = uuid();
  const restrictedPass = uuid();
  const restrictedFacilityId = uuid();
  const restrictedFacilityId2 = uuid();
  const restrictedContactId = uuid();
  const patientId = uuid();
  const patientId2 = uuid();
  const report1 = uuid();
  const report2 = uuid();
  const report3 = uuid();
  const report4 = uuid();

  const contact = { _id: restrictedContactId, parent: { _id: restrictedFacilityId } };

  const restrictedUser = userSettings.build({
    _id: `org.couchdb.user:${restrictedUserName}`,
    type: 'user',
    name: restrictedUserName,
    password: restrictedPass,
    facility_id: [restrictedFacilityId, restrictedFacilityId2],
    roles: ['chw']
  });

  const initialDocs = [
    userSettings.build({
      _id: `org.couchdb.user:${restrictedUserName}`,
      roles: ['chw'],
      facility_id: restrictedFacilityId,
      contact_id: restrictedContactId,
      name: restrictedUserName
    }),
    placeFactory.place().build({
      _id: restrictedFacilityId,
      type: 'health_center',
      contact
    }),
    personFactory.build(contact),
    personFactory.build({ _id: patientId, parent: { _id: restrictedFacilityId } }),
    personFactory.build({ _id: patientId2, parent: { _id: restrictedFacilityId2 } })
  ];

  const initialReports = [
    genericReportFactory.report().build({
      _id: report1,
      form: 'form_type_1',
      content_type: 'xml',
      contact,
      fields: { patient_id: patientId }
    }),
    genericReportFactory.report().build({
      _id: report2,
      form: 'form_type_2',
      content_type: 'xml',
      contact,
      fields: { patient_id: patientId }
    }),
    genericReportFactory.report().build({
      _id: report3,
      form: 'form_type_3',
      content_type: 'xml',
      contact,
      fields: { patient_id: patientId }
    }),
    genericReportFactory.report().build({
      _id: report4,
      form: 'form_type_4',
      content_type: 'xml',
      contact,
      fields: { patient_id: patientId2 }
    })
  ];

  const getServerRevs = async (docIds) => {
    const result = await utils.requestOnMedicDb({ path: '/_all_docs', qs: { keys: JSON.stringify(docIds) } });
    return result.rows;
  };

  before(async () => {
    await utils.saveDocs([...initialDocs, ...initialReports]);
    await utils.request({
      path: `/_users/org.couchdb.user:${restrictedUserName}`,
      method: 'PUT',
      body: restrictedUser
    });
    await sentinelUtils.waitForSentinel();
    await loginPage.login({ username: restrictedUserName, password: restrictedPass });
    await commonElements.tabsSelector.analyticsTab().waitForDisplayed();
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
  });

  it('should not filter allowed docs', async () => {
    await chtDbUtils.updateDoc(report1, { extra: '1' });
    await chtDbUtils.updateDoc(report2, { extra: '2' });
    await chtDbUtils.updateDoc(patientId, { extra: '3' });
    await chtDbUtils.updateDoc(report4, { extra: '2' });
    await chtDbUtils.updateDoc(patientId2, { extra: '3' });
    const newReport = { ...initialReports[0], _id: uuid(), extra: '4' };
    const { rev } = await chtDbUtils.createDoc(newReport);
    newReport._rev = rev;

    await commonElements.sync();

    // docs were successfully synced to the server
    const [
      updatedReport1,
      updatedReport2,
      updatedPatient,
      updatedNewReport,
      updatedReport4,
      updatedPatient2,
    ] = await utils.getDocs([report1, report2, patientId, newReport._id, report4, patientId2]);

    expect(updatedReport1.extra).to.equal('1');
    expect(updatedReport2.extra).to.equal('2');
    expect(updatedPatient.extra).to.equal('3');
    expect(updatedNewReport).to.deep.equal(newReport);
    expect(updatedReport4.extra).to.equal('2');
    expect(updatedPatient2.extra).to.equal('3');
  });

  it('should not filter deletes', async () => {
    await chtDbUtils.updateDoc(report1, { _deleted: true });

    await commonElements.sync();

    const result = await utils.getDocs([report1], true);
    expect(result.rows[0]).excludingEvery('rev').to.deep.equal({
      id: report1,
      key: report1,
      value: { deleted: true },
      doc: null,
    });
  });

  it('should filter resources, service-worker, forms, translations, branding, partners docs', async () => {
    const docIds = [
      'resources',
      'service-worker-meta',
      'form:contact:person:edit',
      'messages-en',
    ];
    const serverRevs = await getServerRevs(docIds);
    for (const docId of docIds) {
      await chtDbUtils.updateDoc(docId, { something: 'random' });
    }

    await commonElements.sync();

    const updatedServerRevs = await getServerRevs(docIds);
    expect(serverRevs).to.deep.equal(updatedServerRevs);
  });

  it('should filter locally purged docs', async () => {
    const { rev: localRev } = await chtDbUtils.updateDoc(report3, { _deleted: true, purged: true }, true);

    await commonElements.sync();

    const serverReport = await utils.getDoc(report3);
    expect(serverReport).excludingEvery('_rev').to.deep.equal(initialReports[2]);
    expect(serverReport._rev).to.not.equal(localRev);
    expect(serverReport).to.not.have.property('purged');
  });

  it('should filter ddocs', async () => {
    const newDdoc = { _id: '_design/test' };
    await chtDbUtils.createDoc(newDdoc);
    const serverRevs = await getServerRevs(['_design/medic-client']);
    await chtDbUtils.updateDoc('_design/medic-client', { something: 'random' });
    // updating the ddoc will throw the "upgrade" popup, ignore it!
    await commonElements.closeReloadModal();
    await commonElements.sync();

    const updatedServerRevs = await getServerRevs(['_design/medic-client']);
    expect(serverRevs).to.deep.equal(updatedServerRevs);
    const result = await utils.getDocs(['_design/test'], true);
    expect(result.rows[0]).to.deep.equal({
      key: '_design/test',
      error: 'not_found',
    });
  });

  describe('meta db replication', () => {
    const createMetaDoc = async (doc) => {
      const { err, result } = await browser.executeAsync((doc, callback) => {
        const db = window.CHTCore.DB.get({ meta: true });
        return db
          .put(doc)
          .then(result => callback({ result }))
          .catch(err => callback({ err }));
      }, doc);

      if (err) {
        throw err;
      }

      return result;
    };

    it('should replicate meta db up', async () => {
      const localDoc = { _id: uuid(), extra: 'value' };
      const { rev } = await createMetaDoc(localDoc);
      localDoc._rev = rev;

      await browser.refresh(); // meta databases sync every 30 minutes
      await commonElements.sync();

      const [remoteDoc] = await utils.getMetaDocs(restrictedUserName, [localDoc._id]);
      expect(remoteDoc).to.deep.equal(localDoc);
    });

    it('should replicate meta db down', async () => {
      await browser.refresh(); // meta databases sync every 30 minutes
      await commonElements.sync();
      expect(await reportsPage.getUnreadCount()).to.equal('3');

      const readReport = { _id: `read:report:${report2}` };
      await utils.saveMetaDocs(restrictedUserName, [readReport]);

      await browser.refresh(); // meta databases sync every 30 minutes
      await commonElements.sync();

      // if the test fails, it helps to see which reports are read or not in the failpic
      await commonElements.goToReports();
      await reportsPage.leftPanelSelectors.reportList().waitForDisplayed();

      await browser.waitUntil(async () => await reportsPage.getUnreadCount() === '2');
    });
  });
});
