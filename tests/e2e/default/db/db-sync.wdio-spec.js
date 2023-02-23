const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const chai = require('chai');
const uuid = require('uuid').v4;
const browserDbUtils = require('../../../utils/browser');

/* global window */

describe('db-sync', () => {
  const restrictedUserName = uuid();
  const restrictedPass = uuid();
  const restrictedFacilityId = uuid();
  const restrictedContactId = uuid();
  const patientId = uuid();
  const report1 = uuid();
  const report2 = uuid();
  const report3 = uuid();
  const restrictedUser = {
    _id: `org.couchdb.user:${restrictedUserName}`,
    type: 'user',
    name: restrictedUserName,
    password: restrictedPass,
    facility_id: restrictedFacilityId,
    roles: [ 'chw' ]
  };

  const initialDocs = [
    {
      _id: `org.couchdb.user:${restrictedUserName}`,
      language: 'en',
      known: true,
      type: 'user-settings',
      roles: [ 'chw' ],
      facility_id: restrictedFacilityId,
      contact_id: restrictedContactId,
      name: restrictedUserName
    },
    {
      _id: restrictedFacilityId,
      parent: {
        _id: 'this-does-not-matter'
      },
      name: 'A CHW area',
      type: 'health_center',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      }
    },
    {
      _id: restrictedContactId,
      name: 'CHW User',
      type: 'person',
      reported_date: Date.now(),
      parent: {
        _id: restrictedFacilityId,
        parent: {
          _id: 'this-does-not-matter'
        }
      }
    },
    {
      _id: patientId,
      name: 'A patient',
      reported_date: Date.now(),
      type: 'person',
      parent: {
        _id: restrictedFacilityId,
        parent: {
          _id: 'this-does-not-matter'
        }
      }
    }
  ];

  const initialReports = [
    {
      _id: report1,
      form: 'form_type_1',
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      },
      fields: {
        patient_id: patientId,
        patient_name: 'A patient',
        some: 'data',
      }
    },
    {
      _id: report2,
      form: 'form_type_2',
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      },
      fields: {
        patient_id: patientId,
        patient_name: 'A patient',
        some: 'data',
      }
    },
    {
      _id: report3,
      form: 'form_type_3',
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      },
      fields: {
        patient_id: patientId,
        patient_name: 'A patient',
        some: 'data',
      }
    },
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
    await (await commonElements.analyticsTab()).waitForDisplayed();
  });

  it('should not filter allowed docs', async () => {
    await browserDbUtils.updateDoc(report1, { extra: '1' });
    await browserDbUtils.updateDoc(report2, { extra: '2' });
    await browserDbUtils.updateDoc(patientId, { extra: '3' });
    const newReport = { ...initialReports[0], _id: uuid(), extra: '4' };
    const { rev } = await browserDbUtils.createDoc(newReport);
    newReport._rev = rev;

    await commonElements.sync();

    // docs were successfully synced to the server
    const [
      updatedReport1,
      updatedReport2,
      updatedPatient,
      updatedNewReport,
    ] = await utils.getDocs([report1, report2, patientId, newReport._id]);

    chai.expect(updatedReport1.extra).to.equal('1');
    chai.expect(updatedReport2.extra).to.equal('2');
    chai.expect(updatedPatient.extra).to.equal('3');
    chai.expect(updatedNewReport).to.deep.equal(newReport);
  });

  it('should not filter deletes', async () => {
    await browserDbUtils.updateDoc(report1, { _deleted: true });

    await commonElements.sync();

    const result = await utils.getDocs([report1], true);
    chai.expect(result.rows[0]).excludingEvery('rev').to.deep.equal({
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
      await browserDbUtils.updateDoc(docId, { something: 'random' });
    }

    await commonElements.sync();

    const updatedServerRevs = await getServerRevs(docIds);
    chai.expect(serverRevs).to.deep.equal(updatedServerRevs);
  });

  it('should filter locally purged docs', async () => {
    const { rev:localRev } = await browserDbUtils.updateDoc(report3, { _deleted: true, purged: true }, true);

    await commonElements.sync();

    const serverReport = await utils.getDoc(report3);
    chai.expect(serverReport).excludingEvery('_rev').to.deep.equal(initialReports[2]);
    chai.expect(serverReport._rev).to.not.equal(localRev);
    chai.expect(serverReport).to.not.have.property('purged');
  });

  it('should filter ddocs', async () => {
    const newDdoc = { _id: '_design/test' };
    await browserDbUtils.createDoc(newDdoc);
    const serverRevs = await getServerRevs(['_design/medic-client']);
    await browserDbUtils.updateDoc('_design/medic-client', { something: 'random' });
    // updating the ddoc will throw the "upgrade" popup, ignore it!
    await commonElements.closeReloadModal();
    await commonElements.sync();

    const updatedServerRevs = await getServerRevs(['_design/medic-client']);
    chai.expect(serverRevs).to.deep.equal(updatedServerRevs);
    const result = await utils.getDocs(['_design/test'], true);
    chai.expect(result.rows[0]).to.deep.equal({
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

      const [ remoteDoc ] = await utils.getMetaDocs(restrictedUserName, [localDoc._id]);
      chai.expect(remoteDoc).to.deep.equal(localDoc);
    });

    it('should replicate meta db down', async () => {
      await browser.refresh(); // meta databases sync every 30 minutes
      await commonElements.sync();
      expect(await reportsPage.getUnreadCount()).to.equal('2');

      const readReport = { _id: `read:report:${report2}` };
      await utils.saveMetaDocs(restrictedUserName, [readReport]);

      await browser.refresh(); // meta databases sync every 30 minutes
      await commonElements.sync();

      // if the test fails, it helps to see which reports are read or not in the failpic
      await commonElements.goToReports();
      await (await reportsPage.reportList()).waitForDisplayed();

      await browser.waitUntil(async () => await reportsPage.getUnreadCount() === '1');
    });
  });
});
