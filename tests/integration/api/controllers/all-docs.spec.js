const chai = require('chai');
const _ = require('lodash');
const utils = require('@utils');
const constants = require('@constants');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
  place_id: 'district_hospital_shortcode',
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      place_id: 'offline_hc_shortcode',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
      patient_id: 'offline_user_shortcode',
    },
    roles: ['district_admin']
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
      place_id: 'online_hc_shortcode',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
      patient_id: 'online_user_shortcode',
    },
    roles: ['national_admin']
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor',
      patient_id: 'supervisor_user_shortcode',
    },
    roles: ['district_admin'],
  },
];

let offlineRequestOptions;
let onlineRequestOptions;

const DOCS_TO_KEEP = [
  'PARENT_PLACE',
  /^messages-/,
  /^fixture/,
  /^org.couchdb.user/,
];

const restrictedKeys = [
  'fixture:online',
  'fixture:user:online',
  'org.couchdb.user:online',
  'migration-log',
  /^_design\/medic-(?!client).+$/
];

const unrestrictedKeys = [
  'service-worker-meta',
  'fixture:offline',
  'fixture:user:offline',
  'org.couchdb.user:offline',
  '_design/medic-client',
  'resources',
  'settings',
  /^messages-.*$/
];

const hasMatchingRow = (rows, id, exact = true) => {
  return !!rows.find(row => exact ? row.id === id : row.id.match(id));
};

describe('all_docs handler', () => {
  before(() => {
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users));
  });

  after(() =>
    utils
      .revertDb([], true)
      .then(() => utils.deleteUsers(users))
  );

  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));
  beforeEach(() => {
    offlineRequestOptions = {
      path: '/_all_docs',
      auth: { username: 'offline', password },
      method: 'GET'
    };

    onlineRequestOptions = {
      path: '/_all_docs',
      auth: { username: 'online', password },
      method: 'GET'
    };
  });

  it('does not filter online users', () => {
    return utils
      .requestOnTestDb(onlineRequestOptions)
      .then(result => {
        unrestrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(true);
        });
        restrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(true);
        });
      });
  });

  it('filters offline users results', () => {
    const supervisorRequestOptions = {
      path: '/_all_docs',
      auth: { username: 'supervisor', password },
      method: 'GET'
    };
    const lineage = { _id: 'PARENT_PLACE' };
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline', parent: lineage }, type: 'clinic' },
      { _id: 'allowed_report', contact: { _id: 'fixture:offline', parent: lineage }, type: 'data_record', form: 'a' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online', parent: lineage }, type: 'clinic' },
      { _id: 'denied_report', contact: { _id: 'fixture:online', parent: lineage }, type: 'data_record', form: 'a' },
      { _id: 'allowed_task', user: 'org.couchdb.user:offline', type: 'task', owner: 'fixture:user:offline' },
      { _id: 'denied_task', user: 'org.couchdb.user:online', type: 'task', owner: 'fixture:user:offline' },
      { _id: 'allowed_target', user: 'org.couchdb.user:offline', type: 'target', owner: 'fixture:user:offline' },
      { _id: 'denied_target', user: 'org.couchdb.user:online', type: 'target', owner: 'fixture:user:online' },
    ];

    return utils
      .saveDocs(docs)
      .then(() => utils.requestOnTestDb(offlineRequestOptions))
      .then(result => {
        unrestrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(true);
        });
        restrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(false);
        });

        const ids = result.rows.map(row => row.id);
        chai.expect(ids).to.include.members([
          'allowed_contact',
          'allowed_report',
          'allowed_task',
          'allowed_target',
        ]);
        chai.expect(ids).not.to.include.members([
          'denied_contact',
          'denied_report',
          'denied_task',
          'denied_target',
        ]);
      })
      .then(() => utils.requestOnTestDb(supervisorRequestOptions))
      .then(result => {
        const ids = result.rows.map(row => row.id);
        chai.expect(ids).to.include.members([
          'allowed_contact',
          'allowed_report',
          'allowed_target',
          'denied_contact',
          'denied_report',
          'denied_target',
        ]);
        chai.expect(ids).not.to.include.members([
          'allowed_task',
          'denied_task',
        ]);
      });
  });

  it('filters offline users when requested with key param', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' }
    ];

    return utils
      .saveDocs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="allowed_contact"'}, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="denied_contact"'}, offlineRequestOptions))
      ]))
      .then(([allowed, denied]) => {
        chai.expect(allowed.rows.length).to.equal(1);
        chai.expect(allowed.rows[0]).excludingEvery('rev').to.deep.equal(
          { id: 'allowed_contact', key: 'allowed_contact', value: { }}
        );
        chai.expect(denied.rows.length).to.deep.equal(1);
        chai.expect(denied.rows[0]).to.deep.equal({ id: 'denied_contact', error: 'forbidden'});
      });
  });

  it('filters offline users when requested with keys param', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'allowed_report', contact: { _id: 'fixture:offline'}, type: 'data_record', form: 'a' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' },
    ];

    const keys = [
      'allowed_contact', 'denied_contact', 'allowed_report', 'denied_report',
      'fixture:offline', 'fixture:online', 'fakeID'
    ];

    const request = {
      method: 'POST',
      body: { keys },
      headers: { 'Content-Type': 'application/json' }
    };

    const allowed = [0, 2, 4];

    return utils
      .saveDocs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(request, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?keys=' + JSON.stringify(keys) }, offlineRequestOptions))
      ]))
      .then((results) => {
        results.forEach(result => {
          chai.expect(result.rows.length).to.equal(7);
          result.rows.forEach((row, idx) => {
            // results are returned in the same sequence as requested
            chai.expect(row.id).to.equal(keys[idx]);

            if (allowed.includes(idx)) {
              chai.expect(row.value.rev).to.be.ok;
            } else {
              chai.expect(row.error).to.equal('forbidden');
            }
          });
        });

      });
  });

  it('filters offline users when requested with start_key / end_key', () => {
    const docs = [
      { _id: '1', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '2', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '3', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '4', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '5', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '6', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '7', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '8', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '9', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '10', parent: { _id: 'fixture:offline'}, type: 'clinic' },
    ];

    return utils
      .saveDocs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: '/_all_docs?start_key="10"&end_key="8"' }, offlineRequestOptions)
        ),
        utils.requestOnTestDb(_.defaults(
          { path: '/_all_docs?startkey="10"&endkey="8"&inclusive_end=false'}, offlineRequestOptions)
        )
      ]))
      .then(([inclusive, exclusive]) => {
        chai.expect(inclusive.rows.length).to.equal(5);
        chai.expect(exclusive.rows.length).to.equal(4);

        const inclusiveIds = inclusive.rows.map(row => row.id);
        chai.expect(inclusiveIds).to.have.members(['10', '3', '4', '6', '8']);
        const exclusiveIds = exclusive.rows.map(row => row.id);
        chai.expect(exclusiveIds).to.have.members(['10', '3', '4', '6']);
      });
  });

  it('should filter offline users requests when requesting keys with include_docs', () => {
    const docs = [
      { _id: '1', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '2', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '3', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '4', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '5', parent: { _id: 'fixture:online'}, type: 'clinic' }
    ];
    const keys = docs.map(doc => doc._id);
    const allowed = ['1', '3', '4'];

    return utils
      .saveDocs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?keys=${JSON.stringify(keys)}&include_docs=true` }, offlineRequestOptions)
        ),
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?keys=${JSON.stringify(keys)}&include_docs=false` }, offlineRequestOptions)
        )
      ]))
      .then(([includeDocs, excludeDocs]) => {
        chai.expect(includeDocs.rows.length).to.equal(5);
        chai.expect(includeDocs.rows.map(row => row.id)).to.have.members(['1', '2', '3', '4', '5']);

        chai.expect(excludeDocs.rows.length).to.equal(5);
        chai.expect(excludeDocs.rows.map(row => row.id)).to.have.members(['1', '2', '3', '4', '5']);

        includeDocs.rows.forEach(row => {
          if (allowed.includes(row.id)) {
            const doc = docs.find(doc => doc._id === row.id);
            chai.expect(row.doc).excludingEvery('_rev').to.deep.equal(doc);
          } else {
            chai.expect(row).to.not.have.property('doc');
            chai.expect(row.error).to.equal('forbidden');
          }
        });

        excludeDocs.rows.forEach(row => {
          chai.expect(row).to.not.have.property('doc');
          if (allowed.includes(row.id)) {
            chai.expect(row).to.have.property('value');
          } else {
            chai.expect(row.error).to.equal('forbidden');
          }
        });
      });
  });

  it('should filter offline users requests with skip and limit', () => {
    const docs = [
      { _id: '1', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '2', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: '3', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '4', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: '5', parent: { _id: 'fixture:online'}, type: 'clinic' }
    ];

    // skip all "default" docs
    // this includes those that emit _all or the user settings doc id,
    // along with medic-client ddoc and the user-settings doc itself
    const getSkip = () => {
      const ddocAndUserSettings = 2;
      return utils.db
        .query('medic/docs_by_replication_key', { keys: ['_all', 'org.couchdb.user:offline'] })
        .then(result => {
          return result.rows && result.rows.length + ddocAndUserSettings;
        });
    };

    return utils
      .saveDocs(docs)
      .then(() => getSkip())
      .then(skip => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?limit=2&skip=${skip}&include_docs=false` }, offlineRequestOptions)
        ),
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?limit=1&skip=${skip + 2}&include_docs=true` }, offlineRequestOptions)
        )
      ]))
      .then(([excludeDocs, includeDocs]) => {
        chai.expect(excludeDocs.rows.length).to.equal(2);
        chai.expect(excludeDocs.rows).excludingEvery('value').to.have.deep.members([
          { id: '1', key: '1' }, { id: '3', key: '3' }
        ]);
        excludeDocs.rows.forEach(row => chai.expect(row).to.not.have.property('doc'));

        chai.expect(includeDocs.rows.length).to.equal(1);
        chai.expect(includeDocs.rows[0].id).to.equal('4');
        chai.expect(includeDocs.rows[0].doc).excludingEvery('_rev').to.deep.equal(
          { _id: '4', parent: { _id: 'fixture:offline'}, type: 'clinic' }
        );
      });
  });

  it('returns correct info for restricted deleted documents', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'allowed_report', contact: { _id: 'fixture:offline'}, type: 'data_record', form: 'a' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' },
    ];

    const keys = docs.map(doc => doc._id);

    return utils
      .saveDocs(docs)
      .then(result => {
        result.forEach((stub, key) => {
          docs[key]._rev = stub.rev;
          docs[key]._deleted = true;
        });
        return utils.saveDocs(docs);
      })
      .then(result => {
        // can't afford to wait for sentinel to process these deletes :(
        const tombstones = docs.map((doc, idx) => {
          doc._rev = result[idx].rev;

          return {
            _id: doc._id + '____' + result[idx].rev + '____tombstone',
            type: 'tombstone',
            tombstone: doc
          };
        });

        return utils.saveDocs(tombstones);
      })
      .then(() =>
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?keys=' + JSON.stringify(keys) }, offlineRequestOptions)))
      .then(result => {
        chai.expect(result.rows).to.deep.equal([
          { id: 'allowed_contact', key: 'allowed_contact', value: { rev: docs[0]._rev, deleted: true }},
          { id: 'allowed_report', key: 'allowed_report', value: { rev: docs[1]._rev, deleted: true }},
          { id: 'denied_contact', error: 'forbidden' },
          { id: 'denied_report', error: 'forbidden' },
        ]);
      });
  });

  it('should not return sensitive documents', () => {
    const docs = [
      {
        _id: 'insensitive_report_1',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:offline' },
        patient_id: 'fixture:offline'
      },
      {
        _id: 'insensitive_report_2',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:offline' },
        patient_id: 'fixture:offline',
        fields: { private: true },
      },
      {
        _id: 'insensitive_report_3',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        patient_id: 'fixture:offline',
        fields: { private: false },
      },
      {
        _id: 'sensitive_report_1',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        patient_id: 'fixture:offline',
        fields: { private: true },
      },
      {
        _id: 'sensitive_report_2',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        patient_id: 'fixture:user:offline',
        fields: { private: true },
      },
      {
        _id: 'sensitive_report_3',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        fields: { private: true, place_id: 'offline_hc_shortcode' },
      },
      {
        _id: 'sensitive_report_4',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        fields: { private: true, place_id: 'fixture:offline' },
      },
      {
        _id: 'sensitive_report_5',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        fields: { private: true, patient_id: 'offline_user_shortcode' },
      },
      {
        _id: 'sensitive_report_6',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online' },
        fields: { private: true, patient_uuid: 'fixture:user:offline' },
      },
    ];

    const keys = docs.map(doc => doc._id);
    const opts = _.defaults({ path: '/_all_docs?keys=' + JSON.stringify(keys) }, offlineRequestOptions);

    return utils
      .saveDocs(docs)
      .then(result => result.forEach((r, idx) => docs[idx]._rev = r.rev))
      .then(() => utils.requestOnMedicDb(opts))
      .then(result => {
        chai.expect(result.rows).to.deep.equal([
          { id: 'insensitive_report_1', key: 'insensitive_report_1', value: { rev: docs[0]._rev }},
          { id: 'insensitive_report_2', key: 'insensitive_report_2', value: { rev: docs[1]._rev }},
          { id: 'insensitive_report_3', key: 'insensitive_report_3', value: { rev: docs[2]._rev }},
          { id: 'sensitive_report_1', error: 'forbidden' },
          { id: 'sensitive_report_2', error: 'forbidden' },
          { id: 'sensitive_report_3', error: 'forbidden' },
          { id: 'sensitive_report_4', error: 'forbidden' },
          { id: 'sensitive_report_5', error: 'forbidden' },
          { id: 'sensitive_report_6', error: 'forbidden' },
        ]);
      });
  });

  it('filters offline users results when db name is not medic', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'allowed_report', contact: { _id: 'fixture:offline'}, type: 'data_record', form: 'a' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' },
    ];

    return utils
      .saveDocs(docs)
      .then(() => utils.requestOnMedicDb(offlineRequestOptions))
      .then(result => {
        unrestrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(true);
        });
        restrictedKeys.forEach(key => {
          chai.expect(hasMatchingRow(result.rows, key, false)).to.equal(false);
        });

        const ids = result.rows.map(row => row.id);
        chai.expect(ids).to.include.members([
          'allowed_contact',
          'allowed_report',
        ]);
        chai.expect(ids).not.to.include.members([
          'denied_contact',
          'denied_report',
        ]);
      });
  });

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' };

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?key="denied_report"' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '///_all_docs//?key="denied_report"' }, offlineRequestOptions)),
        utils.request(_.defaults(
          { path: `//${constants.DB_NAME}//_all_docs?key="denied_report"` }, offlineRequestOptions)
        ),
        utils
          .requestOnTestDb(_.defaults({ path: '/_all_docs/something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///_all_docs//something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults(
            { path: `//${constants.DB_NAME}//_all_docs/something?key="denied_report"` }, offlineRequestOptions)
          )
          .catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '/_all_docs?key="denied_report"' }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '///_all_docs//?key="denied_report"' }, offlineRequestOptions)),
        utils.request(_.defaults({ path: `//medic//_all_docs?key="denied_report"` }, offlineRequestOptions)),
        utils
          .requestOnMedicDb(_.defaults({ path: '/_all_docs/something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(_.defaults({ path: '///_all_docs//something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//medic//_all_docs/something?key="denied_report"` }, offlineRequestOptions))
          .catch(err => err)
      ]))
      .then(results => {
        results.forEach(result => {
          chai.expect(result.rows.length).to.equal(1);
          chai.expect(result.rows[0]).to.deep.equal({ id: 'denied_report', error: 'forbidden' });
        });
      });
  });

  describe('replication depth', () => {
    it('should respect replication_depth', () => {
      const docs = [
        {
          // depth = 1
          _id: 'the_clinic',
          type: 'clinic',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        },
        {
          // depth = 2
          _id: 'the_person',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        },
        {
          // depth = 3
          _id: 'the_patient',
          type: 'person',
          parent: { _id: 'the_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
        },
        {
          // depth = 1
          _id: 'report_about_place',
          type: 'data_record',
          form: 'form',
          fields: {
            place_id: 'fixture:offline',
          },
          contact: { _id: 'irrelevant' },
        },
        {
          // depth = 2, own report
          _id: 'allowed_report_about_the_person_1',
          type: 'data_record',
          form: 'form',
          fields: {
            patient_id: 'the_person',
          },
          contact: { _id: 'fixture:user:supervisor' },
        },
        {
          // depth = 2, has needs_signoff
          _id: 'allowed_report_about_the_person_2',
          type: 'data_record',
          form: 'form',
          fields: {
            patient_id: 'the_person',
            needs_signoff: true,
          },
          contact: { _id: 'fixture:user:offline', parent: { _id: 'fixture:offline' } },
        },
        {
          // depth = 2, no needs_signoff
          _id: 'denied_report_about_the_person',
          type: 'data_record',
          form: 'form',
          fields: {
            patient_id: 'the_person',
          },
          contact: { _id: 'fixture:user:offline' },
        },
        {
          // depth = 3, has needs_signoff
          _id: 'allowed_report_about_the_patient',
          type: 'data_record',
          form: 'form',
          fields: {
            patient_id: 'the_patient',
            needs_signoff: true,
          },
          contact: { _id: 'fixture:user:offline', parent: { _id: 'fixture:offline' } },
        },
        {
          // depth = 3, no needs_signoff
          _id: 'denied_report_about_the_patient',
          type: 'data_record',
          form: 'form',
          fields: {
            patient_id: 'the_patient',
          },
          contact: { _id: 'fixture:user:offline', parent: { _id: 'fixture:offline' } },
        },
        {
          // depth = 2
          _id: 'target~offline',
          type: 'target',
          owner: 'fixture:user:offline',
        },
        {
          _id: 'task~supervisor',
          type: 'task',
          user: 'org.couchdb.user:supervisor',
        },
        {
          _id: 'task~offline',
          type: 'task',
          user: 'org.couchdb.user:offline',
        }
      ];

      const supervisorRequestOptions = {
        path: '/_all_docs',
        auth: { username: 'supervisor', password },
        method: 'GET'
      };

      const keys = docs.map(doc => doc._id);

      const settings = { replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }] };
      return utils
        .updateSettings(settings, true)
        .then(() => utils.saveDocs(docs))
        .then(() => Promise.all([
          utils.requestOnMedicDb(Object.assign({ qs: { keys: keys  } }, supervisorRequestOptions)),
          utils.requestOnMedicDb(supervisorRequestOptions),
        ]))
        .then(([withKeys, withoutKeys]) => {
          const expectedRowsWithKeys = [
            { id: 'the_clinic', key: 'the_clinic', value: {} },
            { id: 'the_person', key: 'the_person', value: {} },
            { id: 'the_patient', error: 'forbidden' },
            { id: 'report_about_place', key: 'report_about_place', value: {} },
            { id: 'allowed_report_about_the_person_1', key: 'allowed_report_about_the_person_1', value: {} },
            { id: 'allowed_report_about_the_person_2', key: 'allowed_report_about_the_person_2', value: {} },
            { id: 'denied_report_about_the_person', error: 'forbidden' },
            { id: 'allowed_report_about_the_patient', key: 'allowed_report_about_the_patient', value: {} },
            { id: 'denied_report_about_the_patient', error: 'forbidden' },
            { id: 'target~offline', key: 'target~offline', value: {} },
            { id: 'task~supervisor', key: 'task~supervisor', value: {} },
            { id: 'task~offline', error: 'forbidden' },
          ];
          const expectedRowsWithoutKeys = expectedRowsWithKeys.filter(row => !row.error);

          chai.expect(withKeys.rows).excludingEvery('rev').to.deep.equal(expectedRowsWithKeys);
          chai.expect(withoutKeys.rows).excludingEvery('rev').to.deep.include.members(expectedRowsWithoutKeys);
        });
    });
  });
});
