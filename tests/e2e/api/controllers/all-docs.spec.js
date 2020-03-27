const _ = require('lodash');
const utils = require('../../../utils');
const constants = require('../../../constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital'
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser'
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
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser'
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

describe('all_docs handler', () => {
  beforeAll(done => {
    utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users))
      .then(done);
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users))
      .then(done)
  );

  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));
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
        expect(unrestrictedKeys.every(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(true);
        expect(restrictedKeys.every(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(true);
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
        expect(unrestrictedKeys.every(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(true);
        expect(restrictedKeys.some(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(false);

        expect(result.rows.findIndex(row => row.id === 'allowed_contact')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'allowed_report')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'allowed_task')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'allowed_target')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_contact')).toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_report')).toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_task')).toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_target')).toEqual(-1);
      })
      .then(() => utils.requestOnTestDb(supervisorRequestOptions))
      .then(result => {
        const resultIds = result.rows.map(row => row.id);
        expect(resultIds).toContain('allowed_contact');
        expect(resultIds).toContain('allowed_report');
        expect(resultIds).not.toContain('allowed_task');
        expect(resultIds).toContain('allowed_target');
        expect(resultIds).toContain('denied_contact');
        expect(resultIds).toContain('denied_report');
        expect(resultIds).not.toContain('denied_task');
        expect(resultIds).toContain('denied_target');
      });
  });

  it('filters offline users when requested with key param', () => {
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' }
    ];

    return utils
      .saveDocs(docs)
      .then(result => {
        result.forEach((stub, key) => docs[key]._rev = stub.rev);
        return Promise.all([
          utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="allowed_contact"'}, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({path: '/_all_docs?key="denied_contact"'}, offlineRequestOptions))
        ]);
      })
      .then(result => {
        expect(result[0].rows.length).toEqual(1);
        expect(result[0].rows[0]).toEqual(
          { id: 'allowed_contact', key: 'allowed_contact', value: { rev: docs[0]._rev } });
        expect(result[1].rows.length).toEqual(1);
        expect(result[1].rows[0]).toEqual({ id: 'denied_contact', error: 'forbidden'});
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
      .then(results => {
        results.forEach(result => {
          expect(result.rows.length).toEqual(7);
          result.rows.forEach((row, idx) => {
            expect(row.id).toEqual(keys[idx]);
            if (allowed.indexOf(idx) !== -1) {
              expect(row.value.rev).toBeTruthy();
            } else {
              expect(row.error).toEqual('forbidden');
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
      .then(result => {
        expect(result[0].rows.length).toEqual(5);
        expect(result[1].rows.length).toEqual(4);

        expect(result[0].rows.map(row => row.id)).toEqual(['10', '3', '4', '6', '8']);
        expect(result[1].rows.map(row => row.id)).toEqual(['10', '3', '4', '6']);
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
      .then(results => {
        expect(results[0].rows.length).toEqual(5);
        expect(results[0].rows.map(row => row.id)).toEqual(['1', '2', '3', '4', '5']);
        expect(results[1].rows.length).toEqual(5);
        expect(results[1].rows.map(row => row.id)).toEqual(['1', '2', '3', '4', '5']);

        results[0].rows.forEach(row => {
          if (allowed.includes(row.id)) {
            // jasmine.objectContaining is like a chai's deep.include
            expect(row.doc).toEqual(jasmine.objectContaining(docs.find(doc => doc._id === row.id)));
          } else {
            expect(row.doc).not.toBeDefined();
            expect(row.error).toEqual('forbidden');
          }
        });

        expect(results[1].rows.every(row => !row.doc)).toBe(true);
        results[1].rows.forEach(row => {
          if (allowed.includes(row.id)) {
            expect(row.value).toBeDefined();
          } else {
            expect(row.error).toEqual('forbidden');
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
      .then(results => {
        expect(results[0].rows.length).toEqual(2);
        expect(results[0].rows.map(row => row.id)).toEqual(['1', '3']);
        expect(results[0].rows.every(row => !row.doc)).toBe(true);
        expect(results[1].rows.length).toEqual(1);
        expect(results[1].rows[0].id).toEqual('4');
        expect(results[1].rows[0].doc)
          .toEqual(jasmine.objectContaining({ _id: '4', parent: { _id: 'fixture:offline'}, type: 'clinic' }));
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
        expect(result.rows).toEqual([
          { id: 'allowed_contact', key: 'allowed_contact', value: { rev: docs[0]._rev, deleted: true }},
          { id: 'allowed_report', key: 'allowed_report', value: { rev: docs[1]._rev, deleted: true }},
          { id: 'denied_contact', error: 'forbidden' },
          { id: 'denied_report', error: 'forbidden' },
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
      .then(() => utils.requestOnMedicDb(offlineRequestOptions)).then(result => {
        expect(unrestrictedKeys.every(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(true);
        expect(restrictedKeys.some(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(false);

        expect(result.rows.findIndex(row => row.id === 'allowed_contact')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'allowed_report')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_contact')).toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_contact')).toEqual(-1);
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
        expect(results.every(result => {
          if (result.rows) {
            return result.rows.length === 1 &&
                   result.rows[0].id === 'denied_report' &&
                   result.rows[0].error === 'forbidden';
          }
        })).toBe(true);
      });
  });
});
