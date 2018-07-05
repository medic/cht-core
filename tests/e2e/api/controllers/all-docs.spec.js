const _ = require('underscore'),
      utils = require('../../../utils'),
      constants = require('../../../constants');

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
  }
];

let offlineRequestOptions,
    onlineRequestOptions;

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
  'appcache',
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
      .then(() => Promise.all(users.map(user => utils.request({
        path: '/api/v1/users',
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: user
      }))))
      .then(done);
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users.map(user => user.username)))
      .then(done)
  );

  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));
  beforeEach(() => {
    offlineRequestOptions = {
      path: '/_all_docs',
      auth: `offline:${password}`,
      method: 'GET'
    };

    onlineRequestOptions = {
      path: '/_all_docs',
      auth: `online:${password}`,
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
    const docs = [
      { _id: 'allowed_contact', parent: { _id: 'fixture:offline'}, type: 'clinic' },
      { _id: 'allowed_report', contact: { _id: 'fixture:offline'}, type: 'data_record', form: 'a' },
      { _id: 'denied_contact', parent: { _id: 'fixture:online'}, type: 'clinic' },
      { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' },
    ];

    return utils
      .saveDocs(docs)
      .then(() => utils.requestOnTestDb(offlineRequestOptions)).then(result => {
        expect(unrestrictedKeys.every(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(true);
        expect(restrictedKeys.some(id => result.rows.find(row => row.id === id || row.id.match(id)))).toBe(false);

        expect(result.rows.findIndex(row => row.id === 'allowed_contact')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'allowed_report')).not.toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_contact')).toEqual(-1);
        expect(result.rows.findIndex(row => row.id === 'denied_contact')).toEqual(-1);
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
          utils.requestOnTestDb(_.defaults({path: '/_all_docs?key=allowed_contact'}, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({path: '/_all_docs?key=denied_contact'}, offlineRequestOptions))
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
      body: JSON.stringify({ keys }),
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
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?start_key=10&end_key=8' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({
          path: '/_all_docs?startkey=10&endkey=8&inclusive_end=false'
        }, offlineRequestOptions))
      ]))
      .then(result => {
        expect(result[0].rows.length).toEqual(5);
        expect(result[1].rows.length).toEqual(4);

        expect(result[0].rows.map(row => row.id)).toEqual(['10', '3', '4', '6', '8']);
        expect(result[1].rows.map(row => row.id)).toEqual(['10', '3', '4', '6']);
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

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' };

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_all_docs?key=denied_report' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '///_all_docs//?key=denied_report' }, offlineRequestOptions)),
        utils.request(_.defaults({ path: `//${constants.DB_NAME}//_all_docs?key=denied_report` }, offlineRequestOptions)),
        utils
          .requestOnTestDb(_.defaults({ path: '/_all_docs/something?key=denied_report' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///_all_docs//something?key=denied_report' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//_all_docs/something?key=denied_report` }, offlineRequestOptions))
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
