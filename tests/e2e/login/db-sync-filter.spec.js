const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po.js');
const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const uuid = require('uuid/v4');

/* global window */

describe('db-sync-filter', () => {
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
    roles: [
      'district-manager',
      'kujua_user',
      'data_entry',
      'district_admin'
    ]
  };

  const initialDocs = [
    {
      _id: `org.couchdb.user:${restrictedUserName}`,
      language: 'en',
      known: true,
      type: 'user-settings',
      roles: [
        'district-manager',
        'kujua_user',
        'data_entry',
        'district_admin'
      ],
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
  ];

  const updateDoc = (docId, changes, overwrite) => {
    return browser.executeAsyncScript((docId, changes, overwrite) => {
      const callback = arguments[arguments.length - 1];
      const db = window.CHTCore.DB.get();
      return db.get(docId)
        .then(doc => {
          if (overwrite) {
            doc = { _rev: doc._rev, _id: doc._id };
          }

          Object.assign(doc, changes);
          return db.put(doc);
        })
        .then(result => callback(result))
        .catch(err => callback(err));
    }, docId, changes, overwrite);
  };

  const getServerRevs = async (docIds) => {
    const result = utils.requestOnMedicDbNative({ path: '/_all_docs', params: { keys: docIds } });
    return result.rows;
  };

  beforeAll(async () => {
    await commonElements.goToMessagesNative();
    await utils.saveDocsNative([...initialDocs, ...initialReports]);
    await utils.requestNative({
      path: `/_users/org.couchdb.user:${restrictedUserName}`,
      method: 'PUT',
      body: restrictedUser
    });
    await utils.resetBrowser();
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(restrictedUserName, restrictedPass);
    await commonElements.calmNative();
  });

  afterAll(async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await utils.deleteUsersNative([restrictedUserName]);
    await utils.revertDbNative();
  });

  it('should not filter allowed docs', async () => {
    await updateDoc(report1, { extra: '1' });
    await updateDoc(report2, { extra: '2' });
    await updateDoc(patientId, { extra: '3' });

    await commonElements.syncNative();

    // docs were successfully synced to the server
    const [ updatedReport1, updatedReport2, updatedPatient ] = await utils.getDocsNative([report1, report2, patientId]);
    console.log(updatedPatient);
    chai.expect(updatedReport1.extra).to.equal('1');
    chai.expect(updatedReport2.extra).to.equal('2');
    chai.expect(updatedPatient.extra).to.equal('3');
  });

  it('should not filter deletes', async () => {
    await updateDoc(report1, { _deleted: true });

    await commonElements.syncNative();

    const result = await utils.getDocsNative([report1], true);
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
      'form:pregnancy',
      'messages-en',
    ];
    const serverRevs = await getServerRevs(docIds);
    console.log(JSON.stringify(serverRevs, null, 2));
    for (const docId of docIds) {
      await updateDoc(docId, { something: 'random' });
    }

    await commonElements.syncNative();

    const updatedServerRevs = await getServerRevs(docIds);
    chai.expect(serverRevs).to.deep.equal(updatedServerRevs);
  });

  it('should filter locally purged docs', async () => {
    const { rev:localRev } = await updateDoc(report3, { _deleted: true, purged: true }, true);

    await commonElements.syncNative();

    const serverReport = await utils.getDocNative(report3);
    chai.expect(serverReport).excludingEvery('_rev').to.deep.equal(initialReports[2]);
    chai.expect(serverReport._rev).to.not.equal(localRev);
    chai.expect(serverReport).to.not.have.property('purged');
  });
});
