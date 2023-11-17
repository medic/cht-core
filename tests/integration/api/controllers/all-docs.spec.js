const chai = require('chai');
const _ = require('lodash');
const utils = require('@utils');
const constants = require('@constants');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const expect = chai.expect;

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
  place_id: 'district_hospital_shortcode',
};

const getIdsForUser = (user) => [
  `org.couchdb.user:${user}`,
  'settings',
  '_design/medic-client',
  'service-worker-meta'
];

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
      .then(() => utils.deleteUsers(users)));

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
      .saveDocsRevs(docs)
      .then(() => utils.requestOnTestDb(offlineRequestOptions))
      .then(result => {
        expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
      })
      .then(() => utils.requestOnTestDb(supervisorRequestOptions))
      .then(result => {
        expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('supervisor'));
      });
  });

  it('filters offline users when requested with key param', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' }
    ];

    return utils
      .saveDocsRevs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="allowed_contact"'}, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="denied_contact"'}, offlineRequestOptions))
      ]))
      .then(([allowed, denied]) => {
        expect(allowed.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        expect(denied.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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

    return utils
      .saveDocsRevs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(request, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?keys=' + JSON.stringify(keys) }, offlineRequestOptions))
      ]))
      .then((results) => {
        expect(results[0].rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        expect(results[1].rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
      .saveDocsRevs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: '/_all_docs?start_key="10"&end_key="8"' }, offlineRequestOptions
        )),
        utils.requestOnTestDb(_.defaults(
          { path: '/_all_docs?startkey="10"&endkey="8"&inclusive_end=false'}, offlineRequestOptions
        ))
      ]))
      .then(([inclusive, exclusive]) => {
        expect(inclusive.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        expect(exclusive.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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

    return utils
      .saveDocsRevs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?keys=${JSON.stringify(keys)}&include_docs=true` }, offlineRequestOptions
        )),
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?keys=${JSON.stringify(keys)}&include_docs=false` }, offlineRequestOptions
        ))
      ]))
      .then(([includeDocs, excludeDocs]) => {
        expect(includeDocs.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        expect(excludeDocs.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        // todo
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

    return utils
      .saveDocsRevs(docs)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?limit=2&skip=2&include_docs=false` }, offlineRequestOptions
        )),
        utils.requestOnTestDb(_.defaults(
          { path: `/_all_docs?limit=1&skip=4&include_docs=true` }, offlineRequestOptions
        ))
      ]))
      .then(([excludeDocs, includeDocs]) => {
        expect(excludeDocs.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
        expect(includeDocs.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
      .saveDocsRevs(docs)
      .then(result => {
        result.forEach((stub, key) => {
          docs[key]._deleted = true;
        });
        return utils.saveDocsRevs(docs);
      })
      .then(() =>
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?keys=' + JSON.stringify(keys) }, offlineRequestOptions)))
      .then(result => {
        expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
      .saveDocsRevs(docs)
      .then(() => utils.requestOnMedicDb(opts))
      .then(result => {
        expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
      .saveDocsRevs(docs)
      .then(() => utils.requestOnMedicDb(offlineRequestOptions))
      .then(result => {
        expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
          { path: `//${constants.DB_NAME}//_all_docs?key="denied_report"` }, offlineRequestOptions
        )),
        utils
          .requestOnTestDb(_.defaults({ path: '/_all_docs/something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///_all_docs//something?key="denied_report"' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults(
            { path: `//${constants.DB_NAME}//_all_docs/something?key="denied_report"` }, offlineRequestOptions
          ))
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
          expect(result.rows.map(row => row.id)).to.have.members(getIdsForUser('offline'));
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
        .then(() => utils.saveDocsRevs(docs))
        .then(() => Promise.all([
          utils.requestOnMedicDb(Object.assign({ qs: { keys: keys  } }, supervisorRequestOptions)),
          utils.requestOnMedicDb(supervisorRequestOptions),
        ]))
        .then(([withKeys, withoutKeys]) => {
          expect(withKeys.rows.map(row => row.id)).to.have.members(getIdsForUser('supervisor'));
          expect(withoutKeys.rows.map(row => row.id)).to.have.members(getIdsForUser('supervisor'));
        });
    });
  });
});
