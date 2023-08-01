const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;

const DEFAULT_EXPECTED = [
  'service-worker-meta',
  'settings',
  'resources',
  'branding',
  // 'partners',
  '_design/medic-client'
];
const defaultDocRegex = /^(messages-|form:)/;
const isFormOrTranslation = id => defaultDocRegex.test(id);
const getIds = docsOrChanges => docsOrChanges.map(elem => elem._id || elem.id);

const password = 'passwordSUP3RS3CR37!';

const requestDocs = (username) => {
  const options = {
    path: '/api/v1/replication/get-ids',
    auth: { username, password }
  };
  return utils.request(options);
};

const requestDeletes = (username, docIds = []) => {
  const options = {
    path: '/api/v1/replication/get-deletes',
    method: 'POST',
    body: { doc_ids: docIds },
    auth: { username, password }
  };
  return utils.request(options);
};

const assertDocIds = (response, ...expectedIds) => {
  const receivedIds = response.doc_ids_revs
    .map(pair => pair.id)
    .filter(id => !isFormOrTranslation(id));
  expect(receivedIds).to.include.members([ ...expectedIds, ...DEFAULT_EXPECTED ]);
};

const users = [
  {
    username: 'bob',
    password: password,
    place: {
      _id: 'fixture:bobville',
      type: 'health_center',
      name: 'Bobville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bobville',
    },
    contact: {
      _id: 'fixture:user:bob',
      name: 'Bob',
      patient_id: 'shortcode:user:bob',
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'clare',
    password: password,
    place: {
      _id: 'fixture:clareville',
      type: 'health_center',
      name: 'Clareville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:clareville',
    },
    contact: {
      _id: 'fixture:user:clare',
      name: 'Clare',
      patient_id: 'shortcode:clare',
    },
    roles: ['district_admin']
  },
  {
    username: 'chw-boss',
    password: password,
    place: {
      _id: 'fixture:chw-bossville',
      type: 'health_center',
      name: 'CHW Bossville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:chw-bossville',
    },
    contact: {
      _id: 'fixture:user:chw-boss',
      name: 'CHW Boss',
      patient_id: 'shortcode:user:chw-boss',
    },
    roles: ['district_admin']
  },
  {
    username: 'chw',
    password: password,
    place: {
      _id: 'fixture:chwville',
      type: 'clinic',
      name: 'Chwville',
      parent: 'fixture:chw-bossville',
      place_id: 'shortcode:chwville',
    },
    contact: {
      _id: 'fixture:user:chw',
      name: 'CHW',
      patient_id: 'shortcode:user:chw',
    },
    roles: ['district_admin', 'analytics']
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor',
      patient_id: 'shortcode:user:supervisor',
    },
    roles: ['district_admin']
  },
  {
    username: 'steve',
    password: password,
    place: {
      _id: 'fixture:steveville',
      type: 'health_center',
      name: 'Steveville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:steveville',
    },
    contact: {
      _id: 'fixture:user:steve',
      name: 'Steve',
      patient_id: 'shortcode:user:steve',
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'manager',
    password: password,
    place: {
      _id: 'fixture:managerville',
      type: 'health_center',
      name: 'Managerville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:managerville',
    },
    contact: {
      _id: 'fixture:user:manager',
      name: 'Manager',
      patient_id: 'shortcode:user:manager',
    },
    roles: ['national_admin']
  },
];

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const createSomeContacts = (nbr, parent) => {
  const docs = [];
  parent = typeof parent === 'string' ? { _id: parent } : parent;
  for (let i = 0; i < nbr; i++) {
    docs.push({
      _id: `random_contact_${parent._id}_${uuid()}`,
      type: `clinic`,
      parent: parent
    });
  }

  return docs;
};

describe('replication', () => {
  const DOCS_TO_KEEP = [
    'PARENT_PLACE',
    /^messages-/,
    /^fixture/,
    /^org.couchdb.user/,
  ];

  before(async () => {
    await utils.saveDoc(parentPlace);
    await utils.createUsers(users, true);
  });

  after( async () => {
    // Clean up like normal
    await utils.revertDb([], true);// And also revert users we created in before
    await utils.deleteUsers(users, true);
  });

  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));

  describe('get-ids', () => {
    let bobsIds;
    let stevesIds;
    let chwIds;
    let chwBossIds;
    let supervisorIds;

    beforeEach(() => {
      bobsIds = ['org.couchdb.user:bob', 'fixture:user:bob', 'fixture:bobville'];
      stevesIds = ['org.couchdb.user:steve', 'fixture:user:steve', 'fixture:steveville'];
      chwIds = ['org.couchdb.user:chw', 'fixture:user:chw', 'fixture:chwville'];
      chwBossIds = [
        'org.couchdb.user:chw-boss',
        'fixture:user:chw-boss',
        'fixture:chw-bossville',
        'fixture:chwville',
      ];
      supervisorIds = [
        'org.couchdb.user:supervisor',
        'fixture:user:supervisor',
        'fixture:chw-bossville',
        'fixture:managerville',
        'fixture:clareville',
        'fixture:steveville',
        'fixture:bobville',
        'PARENT_PLACE'
      ];
    });

    it('should return all relevant ids', async () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      await utils.saveDocs([...allowedDocs, ...deniedDocs]);
      const response = await requestDocs('bob');
      assertDocIds(response, ...bobsIds, ...getIds(allowedDocs));
    });

    it('should return relevant ids for concurrent users', async () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      await utils.saveDocs([ ...allowedBob, ...allowedSteve, ...deniedDocs ]);
      const [responseBob, responseSteve] = await Promise
        .all([await requestDocs('bob'), await requestDocs('steve')]);
      assertDocIds(responseBob, ...bobsIds, ...getIds(allowedBob));
      assertDocIds(responseSteve, ...stevesIds, ...getIds(allowedSteve));
    });

    describe('reports with no associated contact', () => {

      it('should be supplied if user has this perm and district_admins_access_unallocated_messages is enabled',
        async () => {
          await utils.updateSettings({ district_admins_access_unallocated_messages: true }, true);
          await utils.saveDoc({ _id:'unallocated_report', type:'data_record' });
          const response = await requestDocs('bob');
          assertDocIds(response, ...bobsIds, 'unallocated_report');
        });

      it('should not be supplied if user has perm but district_admins_access_unallocated_messages is disabled',
        async () => {
          await utils.saveDoc({ _id:'unallocated_report', type:'data_record' });
          const response = await requestDocs('bob');
          assertDocIds(response, ...bobsIds);
        });
    });

    describe('replication depth', () => {
      const docs = [
        {
          _id:'depth_clinic',
          type:'clinic',
          parent: { _id:'fixture:chwville' },
        },
        {
          _id:'depth_person',
          type:'person',
          parent: { _id:'depth_clinic', parent: { _id:'fixture:chwville' } },
        }
      ];

      it('should show contacts to a user only if they are within the configured depth', async () => {
        await utils.updateSettings({ replication_depth: [{ role:'district_admin', depth:1 }] }, true);
        await utils.saveDocs(docs);
        const response = await requestDocs('chw');
        assertDocIds(response, ...chwIds, 'depth_clinic');
      });

      it('should correspond to the largest number for any role the user has', async () => {
        await utils.updateSettings(
          {
            replication_depth: [
              { role:'district_admin', depth:1 },
              { role:'analytics', depth:2 },
            ]
          },
          true);
        await utils.saveDocs(docs);
        const response = await requestDocs('chw');
        assertDocIds(response, ...chwIds, 'depth_clinic', 'depth_person');
      });

      it('should have no effect if not configured', async () => {
        await utils.saveDocs(docs);
        const response = await requestDocs('chw');
        assertDocIds(response, ...chwIds, 'depth_clinic', 'depth_person');
      });
    });

    describe('report replication depth', () => {
      it('should show reports to a user only if they are within the configured depth', async () => {
        const contacts = [
          {
            // depth = 2
            _id: 'chwville_patient',
            type: 'person',
            parent: { _id: 'fixture:chwville', parent: { _id: 'fixture:chw-bossville' } },
            name: 'patient',
          }
        ];
        const reports = [
          {
            // depth = 0, submitted by someone they can see
            _id: 'valid_report_1',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: {
              place_id: 'fixture:chw-bossville',
            },
            type: 'data_record',
          },
          {
            // depth = 2, submitted by the user himself
            _id: 'valid_report_2',
            form: 'form',
            contact: { _id: 'fixture:user:chw-boss' },
            fields: {
              patient_id: 'chwville_patient',
            },
            type: 'data_record',
          },
          {
            // depth = 1, submitted by someone they can't see
            _id: 'valid_report_3',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: {
              place_id: 'fixture:chwville',
            },
            type: 'data_record',
          },
          {
            // depth = 2, submitted by someone they can see
            _id: 'invalid_report_1',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: {
              patient_id: 'fixture:user:chw',
            },
            type: 'data_record'
          },
        ];

        await utils.updateSettings(
          { replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }] },
          true
        );
        await utils.saveDocs(contacts);
        await utils.saveDocs(reports);
        const response = await requestDocs('chw-boss');
        assertDocIds(response, ...chwBossIds, 'chwville_patient', 'valid_report_1', 'valid_report_2', 'valid_report_3');
      });

      it('users should replicate tasks and targets correctly', async () => {
        const docs = [
          {
            // depth = 1
            _id: 'some_contact',
            type: 'person',
            parent: { _id: 'fixture:chwville' },
            name: 'other_contact'
          },
          {
            // depth = 0, submitted by someone they can see (not sensitive)
            _id: 'valid_report_1',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: { place_id: 'fixture:chwville' }
          },
          {
            // depth = 1,
            _id: 'target~chw',
            type: 'target',
            owner: 'fixture:user:chw',
          },
          {
            // depth = 1
            _id: 'task~chw',
            type: 'task',
            user: 'org.couchdb.user:chw',
          },
          {
            // depth = 1, submitted by the user themselves
            _id: 'valid_report_2',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: { patient_id: 'some_contact' }
          },
          {
            // depth = 1, submitted by someone the user can see
            _id: 'invalid_report_1',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: { patient_id: 'some_contact' }
          },
        ];

        await utils.updateSettings(
          { replication_depth: [{ role: 'district_admin', depth: 1, report_depth: 0 }] },
          true
        );
        await utils.saveDocs(docs);
        const response = await requestDocs('chw');
        assertDocIds(response, ...chwIds, 'target~chw', 'task~chw', 'valid_report_1', 'valid_report_2', 'some_contact');
      });
    });

    describe('Needs signoff', () => {
      beforeEach(() => {
        const patient = {
          _id: 'clinic_patient',
          type: 'person',
          reported_date: 1,
          parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
        };
        const healthCenterPatient = {
          _id: 'health_center_patient',
          type: 'person',
          reported_date: 1,
          parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
        };
        return utils.saveDocs([patient, healthCenterPatient]);
      });

      it('should do nothing when not truthy or not present', async () => {
        const clinicReport = {
          _id: 'clinic_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient' },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const clinicReport2 = {
          _id: 'clinic_report_2',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: false },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const healthCenterReport = {
          _id: 'health_center_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'health_center_patient', needs_signoff: ''},
          form: 'f',
          contact: {
            _id: 'fixture:user:chw-boss',
            parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
          }
        };
        const bobReport = {
          _id: 'bob_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'fixture:user:bob', needs_signoff: null },
          form: 'f',
          contact: {
            _id: 'fixture:user:bob',
            parent: { _id:'fixture:bobville', parent: { _id: parentPlace._id }}
          }
        };

        await utils.updateSettings({replication_depth: [{ role:'district_admin', depth: 1 }]}, true);
        await utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]);

        assertDocIds(await requestDocs('chw'), ...chwIds, 'clinic_patient', 'clinic_report', 'clinic_report_2');
        assertDocIds(await requestDocs('chw-boss'), ...chwBossIds,  'health_center_patient', 'health_center_report');
        assertDocIds(await requestDocs('supervisor'), ...supervisorIds);
        assertDocIds(await requestDocs('bob'), ...bobsIds, 'bob_report');
      });

      it('should replicate to all ancestors when present and truthy', async () => {
        const clinicReport = {
          _id: 'clinic_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: true },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const clinicReport2 = {
          _id: 'clinic_report_2',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: 'something' },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const healthCenterReport = {
          _id: 'health_center_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'health_center_patient', needs_signoff: 'YES!'},
          form: 'f',
          contact: {
            _id: 'fixture:user:chw-boss',
            parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
          }
        };
        const bobReport = {
          _id: 'bob_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'fixture:user:bob', needs_signoff: {} },
          form: 'f',
          contact: {
            _id: 'fixture:user:bob',
            parent: { _id:'fixture:bobville', parent: { _id: parentPlace._id }}
          }
        };

        await utils.updateSettings({ replication_depth: [{ role:'district_admin', depth: 1 }]}, true);
        await utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]);

        assertDocIds(await requestDocs('chw'), ...chwIds, 'clinic_patient', 'clinic_report', 'clinic_report_2');
        assertDocIds(
          await requestDocs('chw-boss'),
          ...chwBossIds,
          'health_center_patient',
          'health_center_report',
          'clinic_report',
          'clinic_report_2'
        );
        assertDocIds(
          await requestDocs('supervisor'),
          ...supervisorIds,
          'health_center_report',
          'clinic_report',
          'clinic_report_2',
          'bob_report'
        );
        assertDocIds(await requestDocs('bob'), ...bobsIds, 'bob_report');
      });

      it('should work with report replication depth', async () => {
        const clinicReport = {
          _id: 'clinic_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: true },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const clinicReport2 = {
          _id: 'clinic_report_2',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: 'something' },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const healthCenterReport = {
          _id: 'health_center_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'health_center_patient', needs_signoff: 'YES!'},
          form: 'f',
          contact: {
            _id: 'fixture:user:chw-boss',
            parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
          }
        };
        const bobReport = {
          _id: 'bob_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'fixture:user:bob', needs_signoff: {} },
          form: 'f',
          contact: {
            _id: 'fixture:user:bob',
            parent: { _id:'fixture:bobville', parent: { _id: parentPlace._id }}
          }
        };

        await utils.updateSettings({replication_depth: [{ role:'district_admin', depth: 1, report_depth: 0 }]}, true);
        await utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]);

        assertDocIds(await requestDocs('chw'), ...chwIds, 'clinic_patient', 'clinic_report', 'clinic_report_2');
        assertDocIds(
          await requestDocs('chw-boss'),
          ...chwBossIds,
          'health_center_patient',
          'health_center_report',
          'clinic_report',
          'clinic_report_2'
        );
        assertDocIds(
          await requestDocs('supervisor'),
          ...supervisorIds,
          'health_center_report',
          'clinic_report',
          'clinic_report_2',
          'bob_report'
        );
        assertDocIds(await requestDocs('bob'), ...bobsIds, 'bob_report');
      });
    });

    it('should not return sensitive reports about your place by someone above you in the hierarchy', async () => {
      const docs = [
        {
          // report about home place submitted by logged in user
          _id: 'chw-report-1',
          type: 'data_record',
          place_id: 'fixture:chwville',
          contact: { _id: 'fixture:user:chw' },
          form: 'form',
        },
        {
          // private report about place submitted by logged in user
          _id: 'chw-report-2',
          type: 'data_record',
          place_id: 'fixture:chwville',
          contact: { _id: 'fixture:user:chw' },
          form: 'form',
          fields: { private: true },
        },
        {
          // private report about place submitted by logged in user
          _id: 'chw-report-3',
          type: 'data_record',
          contact: { _id: 'fixture:user:chw' },
          form: 'form',
          fields: { private: true, place_id: 'shortcode:chwville', },
        },
        {
          // private report about self submitted by logged in user
          _id: 'chw-report-4',
          type: 'data_record',
          patient_id: 'shortcode:user:chw',
          contact: { _id: 'fixture:user:chw' },
          form: 'form',
          fields: { private: true },
        },
        {
          // private report about self submitted by logged in user
          _id: 'chw-report-5',
          type: 'data_record',
          contact: { _id: 'fixture:user:chw' },
          form: 'form',
          fields: { private: true, patient_id: 'shortcode:user:chw', },
        },
        {
          // report about place submitted by someone else
          _id: 'chw-report-6',
          type: 'data_record',
          place_id: 'fixture:chwville',
          contact: { _id: 'someone_else' },
          form: 'form',
        },
        {
          // report about place submitted by someone else
          _id: 'chw-report-7',
          type: 'data_record',
          contact: { _id: 'someone_else' },
          fields: { place_id: 'shortcode:chwville' },
          form: 'form',
        },
        {
          // private report about place submitted by someone else
          _id: 'chw-report-8',
          type: 'data_record',
          place_id: 'fixture:chwville',
          contact: { _id: 'someone_else' },
          form: 'form',
          fields: { private: true },
        },
        {
          // private report about place submitted by someone else
          _id: 'chw-report-9',
          type: 'data_record',
          contact: { _id: 'someone_else' },
          form: 'form',
          fields: { private: true, place_id: 'shortcode:chwville', },
        },
        {
          // private report about self submitted by someone else
          _id: 'chw-report-10',
          type: 'data_record',
          contact: { _id: 'someone_else' },
          form: 'form',
          fields: { private: true, patient_id: 'shortcode:user:chw', },
        },
        {
          // private report about self submitted by someone else
          _id: 'chw-report-11',
          type: 'data_record',
          contact: { _id: 'someone_else' },
          form: 'form',
          fields: { private: true, patient_uuid: 'fixture:user:chw', },
        },
      ];

      await utils.saveDocs(docs);
      const response = await requestDocs('chw');
      const expectedReports = [
        'chw-report-1',
        'chw-report-2',
        'chw-report-3',
        'chw-report-4',
        'chw-report-5',
        'chw-report-6',
        'chw-report-7',
      ];
      assertDocIds(response, ...chwIds, ...expectedReports);
    });
  });

  describe('get-deletes', () => {
    const reports = [
      {
        _id: 'not_purged_1',
        type: 'data_record',
        contact: { _id: 'fixture:user:bob' },
        form: 'form',
        fields: { },
      },
      {
        _id: 'not_purged_2',
        type: 'data_record',
        contact: { _id: 'fixture:user:bob' },
        form: 'form',
        fields: { },
      },
      {
        _id: 'purged_1',
        type: 'data_record',
        contact: { _id: 'fixture:user:bob' },
        form: 'form',
        to_be_purged: true,
        fields: { },
      },
      {
        _id: 'purged_2',
        type: 'data_record',
        contact: { _id: 'fixture:user:bob' },
        form: 'form',
        to_be_purged: true,
        fields: { },
      },
    ];

    const purgeFn = function(userCtx, contact, reports) {
      return reports.filter(r => r.to_be_purged).map(r => r._id);
    };

    it('should return nothing if nothing is passed', async () => {
      const response = await requestDeletes('chw');
      expect(response).to.deep.equal({ doc_ids: [] });
    });

    it('should return deleted docs', async () => {
      const contacts = createSomeContacts(3, 'fixture:bobville');
      const irrelevant = createSomeContacts(3, 'irrelevant');
      await utils.saveDocs([...contacts, ...irrelevant]);
      const savedIds = getIds([...contacts, ...irrelevant]);

      const toDelete = createSomeContacts(3, 'fixture:bobville');
      const irrelevanttoDelete = createSomeContacts(3, 'irrelevant');
      await utils.saveDocs([...toDelete, ...irrelevanttoDelete]);
      const deletedIds = getIds([...toDelete, ...irrelevanttoDelete]);
      await utils.deleteDocs(deletedIds);

      const response = await requestDeletes('bob', [...savedIds, ...deletedIds]);
      expect(response.doc_ids).to.have.members(deletedIds);
    });

    it('should return purged docs', async () => {
      await utils.saveDocs(reports);

      const seq = await sentinelUtils.getCurrentSeq();
      await utils.updateSettings({ purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds' } }, true);
      await utils.stopSentinel();
      await utils.startSentinel();
      await sentinelUtils.waitForPurgeCompletion(seq);

      const response = await requestDeletes('bob', getIds(reports));
      expect(response.doc_ids).to.have.members(['purged_1', 'purged_2']);
    });

    it('should return purged and deleted docs', async () => {
      const contacts = createSomeContacts(3, 'fixture:bobville');
      const irrelevant = createSomeContacts(3, 'irrelevant');
      await utils.saveDocs([...contacts, ...irrelevant]);
      const savedIds = getIds([...contacts, ...irrelevant]);

      const toDelete = createSomeContacts(3, 'fixture:bobville');
      const irrelevanttoDelete = createSomeContacts(3, 'irrelevant');
      await utils.saveDocs([...toDelete, ...irrelevanttoDelete]);
      const deletedIds = getIds([...toDelete, ...irrelevanttoDelete]);
      await utils.deleteDocs(deletedIds);

      await utils.saveDocs(reports);
      const seq = await sentinelUtils.getCurrentSeq();
      await utils.updateSettings({ purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds' } }, true);
      await utils.stopSentinel();
      await utils.startSentinel();
      await sentinelUtils.waitForPurgeCompletion(seq);

      const response = await requestDeletes('bob', [...savedIds, ...deletedIds, ...getIds(reports)]);
      expect(response.doc_ids).to.have.members([ ...deletedIds, 'purged_1', 'purged_2']);
    });
  });
});
