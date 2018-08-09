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

describe('bulk-docs handler', () => {
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
      path: '/_bulk_get',
      auth: `offline:${password}`,
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    };

    onlineRequestOptions = {
      path: '/_bulk_get',
      auth: `online:${password}`,
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    };
  });

  it('does not filter online users', () => {
    const docs = [
      { _id: 'ICanBeAnything'},
      { _id: 'NEW_PLACE', parent: {}, type: 'district_hospital', name: 'NEW PLACE' }
    ];

    return utils
      .saveDocs(docs)
      .then(results => {
        onlineRequestOptions.body = JSON.stringify({
          docs: [
            { id: 'ICanBeAnything', rev: results[0].rev },
            { id: 'NEW_PLACE' },
            { id: 'PARENT_PLACE' },
            { id: 'org.couchdb.user:offline' }
          ]
        });

        return utils.requestOnTestDb(onlineRequestOptions);
      })
      .then(result => {
        expect(result.results.length).toEqual(4);
        expect(result.results[0].id).toEqual('ICanBeAnything');
        expect(result.results[0].docs.length).toEqual(1);
        expect(result.results[0].docs[0].ok).toBeTruthy();

        expect(result.results[1].id).toEqual('NEW_PLACE');
        expect(result.results[1].docs.length).toEqual(1);
        expect(_.omit(result.results[1].docs[0].ok, '_rev')).toEqual(docs[1]);

        expect(result.results[2].id).toEqual('PARENT_PLACE');
        expect(result.results[2].docs.length).toEqual(1);
        expect(_.omit(result.results[2].docs[0].ok, '_rev')).toEqual(parentPlace);

        expect(result.results[3].id).toEqual('org.couchdb.user:offline');
        expect(result.results[3].docs.length).toEqual(1);
        expect(result.results[3].docs[0].ok).toBeTruthy();
      });
  });

  it('filters offline users results', () => {
    const docs = [
      { _id: 'allowed_contact_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'allowed_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'denied_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'denied_contact_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((row, idx) => docs[idx]._rev = row.rev);

        offlineRequestOptions.body = JSON.stringify({
          docs: [
            { id: 'allowed_contact_1' },
            { id: 'allowed_contact_2', rev: docs[1].rev },
            { id: 'allowed_contact_2', rev: 'somerev' },
            { id: 'denied_contact_1' },
            { id: 'denied_contact_2', rev: docs[2].rev },
            { id: 'denied_contact_2', rev: 'somerev' },
          ]
        });

        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.results.length).toEqual(2);
        expect(result.results[0].id).toEqual('allowed_contact_1');
        expect(result.results[0].docs.length).toEqual(1);
        expect(result.results[0].docs[0].ok).toEqual(docs[0]);

        expect(result.results[1].id).toEqual('allowed_contact_2');
        expect(result.results[1].docs.length).toEqual(1);
        expect(result.results[1].docs[0].ok).toEqual(docs[1]);
      });
  });

  it('filters offline users based on requested rev', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'd1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'd2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    const revs = {};

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((result, idx) => {
          revs[result.id] = [ result.rev ];
          docs[idx]._rev = result.rev;
        });

        docs[1].parent = { _id: 'fixture:online' };
        docs[1].name = 'Previously allowed Contact 2';

        docs[3].parent = { _id: 'fixture:offline' };
        docs[3].name = 'Previously denied Contact 2';

        return utils.saveDocs(docs);
      })
      .then(results => {
        results.forEach(result => revs[result.id].push(result.rev));

        offlineRequestOptions.body = JSON.stringify({
          docs: [
            { id: 'a1', rev: revs.a1[0] }, // allowed
            { id: 'a1', rev: revs.a1[1] }, // allowed
            { id: 'a2', rev: revs.a2[0] }, // allowed
            { id: 'a2', rev: revs.a2[1] }, // denied
            { id: 'd1', rev: revs.d1[0] }, // denied
            { id: 'd1', rev: revs.d1[1] }, // denied
            { id: 'd2', rev: revs.d2[0] }, // denied
            { id: 'd2', rev: revs.d2[1] } // allowed
          ]
        });
        offlineRequestOptions.path = '/_bulk_get?latest=true';

        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.results.length).toEqual(4);

        expect(result.results[0].id).toEqual('a1');
        expect(result.results[0].docs.length).toEqual(1);
        expect(result.results[0].docs[0].ok).toEqual(
          { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1', _rev: revs.a1[0] });

        expect(result.results[1].id).toEqual('a1');
        expect(result.results[1].docs.length).toEqual(1);
        expect(result.results[1].docs[0].ok).toEqual(
          { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1', _rev: revs.a1[1] });

        expect(result.results[2].id).toEqual('a2');
        expect(result.results[2].docs.length).toEqual(1);
        expect(result.results[2].docs[0].ok).toEqual(
          { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2', _rev: revs.a2[0] });

        expect(result.results[3].id).toEqual('d2');
        expect(result.results[3].docs.length).toEqual(1);
        expect(result.results[3].docs[0].ok).toEqual(
          { _id: 'd2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Previously denied Contact 2', _rev: revs.d2[1] });
      });
  });

  it('uses correct request parameters', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' }
    ];

    offlineRequestOptions.body = JSON.stringify({ docs: [{ id: 'a1' }, { id: 'a2' }] });

    return utils
      .saveDocs(docs)
      .then(result => utils.requestOnTestDb({
        path: `/a1/att1?rev=${result[0].rev}`,
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'a1 attachment content'
      }))
      .then(() => utils.requestOnTestDb(offlineRequestOptions))
      .then(result => {
        expect(result.results.length).toEqual(2);
        expect(result.results[0].id).toEqual('a1');
        expect(result.results[0].docs[0].ok._attachments).toBeTruthy();
        expect(result.results[0].docs[0].ok._attachments.att1.stub).toEqual(true);
        expect(result.results[0].docs[0].ok._revisions).not.toBeTruthy();

        expect(result.results[1].id).toEqual('a2');
        expect(result.results[1].docs[0].ok._attachments).not.toBeTruthy();
        expect(result.results[1].docs[0].ok._revisions).not.toBeTruthy();

        offlineRequestOptions.path = '/_bulk_get?revs=true&attachments=true';
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.results.length).toEqual(2);
        expect(result.results[0].id).toEqual('a1');
        expect(result.results[0].docs[0].ok._attachments).toBeTruthy();
        expect(result.results[0].docs[0].ok._attachments.att1.stub).not.toBeTruthy();
        expect(result.results[0].docs[0].ok._revisions).toBeTruthy();
        expect(result.results[0].docs[0].ok._revisions.ids.length).toEqual(5);

        expect(result.results[1].id).toEqual('a2');
        expect(result.results[1].docs[0].ok._attachments).not.toBeTruthy();
        expect(result.results[1].docs[0].ok._revisions).toBeTruthy();
        expect(result.results[1].docs[0].ok._revisions.ids.length).toEqual(4);
      });
  });

  it('returns bodies of couchDB delete stubs', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'a3', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' }
    ];

    return utils
      .saveDocs(docs)
      .then(result => Promise.all(
        docs.map((doc, key) => utils.requestOnTestDb({ method: 'DELETE', path: `/${doc._id}?rev=${result[key].rev}` }))
      ))
      .then(results => {
        results.forEach((result, key) => docs[key]._rev = result.rev);
        offlineRequestOptions.body = JSON.stringify({
          docs: [
            { id: 'a1', rev: results[0].rev },
            { id: 'a2', rev: results[1].rev },
            { id: 'a3', rev: results[2].rev }
          ]
        });
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.results.length).toEqual(3);
        expect(result.results[0].id).toEqual('a1');
        expect(result.results[0].docs).toEqual([{ ok: { _id: 'a1', _rev: docs[0]._rev, _deleted: true }}]);

        expect(result.results[1].id).toEqual('a2');
        expect(result.results[1].docs).toEqual([{ ok: { _id: 'a2', _rev: docs[1]._rev, _deleted: true }}]);

        expect(result.results[2].id).toEqual('a3');
        expect(result.results[2].docs).toEqual([{ ok: { _id: 'a3', _rev: docs[2]._rev, _deleted: true }}]);
      });
  });

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' };
    offlineRequestOptions.body = JSON.stringify({ docs: [{ _id: 'denied_report' }] });

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_bulk_get' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '///_bulk_get//' }, offlineRequestOptions)),
        utils.request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_get` }, offlineRequestOptions)),
        utils
          .requestOnTestDb(_.defaults({ path: '/_bulk_get/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///_bulk_get//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_get/something` }, offlineRequestOptions))
          .catch(err => err)
      ]))
      .then(results => {
        expect(results.every(result => {
          if (result.results) {
            return result.results.length === 0;
          }

          return result.responseBody === 'Server error';
        })).toBe(true);
      });
  });
});
