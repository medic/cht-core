const _ = require('underscore'),
  utils = require('../../../utils'),
  sUtils = require('../../sentinel/utils'),
  constants = require('../../../constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
    },
    roles: ['district_admin'],
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
    },
    roles: ['national_admin'],
  },
];

let offlineRequestOptions, onlineRequestOptions;

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
      .then(() =>
        Promise.all(
          users.map(user =>
            utils.request({
              path: '/api/v1/users',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: user,
            })
          )
        )
      )
      .then(done);
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users.map(user => user.username)))
      .then(done));

  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));
  beforeEach(() => {
    offlineRequestOptions = {
      path: '/_bulk_docs',
      auth: `offline:${password}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    onlineRequestOptions = {
      path: '/_bulk_docs',
      auth: `online:${password}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
  });

  it('does not filter doc writes for online users', () => {
    const docs = [
      {
        _id: 'NEW_PARENT_PLACE',
        type: 'district_hospital',
        name: 'New Hospital',
      },
      {
        _id: 'NEW_CONTACT',
        parent: { _id: 'NEW_PARENT_PLACE' },
        type: 'person',
        name: 'New Contact',
        reported_date: 1,
      },
      { _id: 'ICanBeAnything' },
    ];

    onlineRequestOptions.body = JSON.stringify({ docs: docs });

    return utils
      .requestOnTestDb(onlineRequestOptions)
      .then(result => {
        expect(result.length).toEqual(3);
        expect(result.every(row => row.ok)).toBe(true);

        return Promise.all(result.map(row => utils.getDoc(row.id)));
      })
      .then(results => {
        results.forEach((result, idx) =>
          expect(_.omit(result, '_rev')).toEqual(docs[idx])
        );
      });
  });

  it('filters offline users requests', () => {
    const existentDocs = [
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 1',
      },
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2',
      },
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1',
      },
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 2',
      },
    ];

    const docs = [
      {
        _id: 'new_allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact',
      },
      {
        _id: 'new_denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact',
      },
      // disallowed update on disallowed doc
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1 updated',
      },
      // allowed update on disallowed doc
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Denied Contact 2 updated',
      },
      // disallowed update on allowed doc
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Allowed Contact 1 updated',
      },
      // allowed update on allowed doc
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2 updated',
      },
      // no _id field disallowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact With no ID',
      },
      // no _id field allowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact With no ID',
      },
    ];

    return utils
      .saveDocs(existentDocs)
      .then(result => {
        let ids = result.map(r => r.id);
        let existentDocsInfodocs;

        result.forEach(
          row => (docs.find(doc => doc._id === row.id)._rev = row.rev)
        );

        return sUtils.waitForSentinel(ids)
          .then(() => sUtils.getInfoDocs(ids))
          .then(result => {
            existentDocsInfodocs = result;
            offlineRequestOptions.body = JSON.stringify({ docs: docs });
            return utils.requestOnTestDb(offlineRequestOptions);
          }).then(result => {
            expect(result.length).toEqual(8);
            expect(_.pick(result[0], 'ok', 'id')).toEqual({
              ok: true,
              id: 'new_allowed_contact_1',
            });
            expect(_.pick(result[5], 'ok', 'id')).toEqual({
              ok: true,
              id: 'allowed_contact_2',
            });
            expect(_.pick(result[7], 'ok')).toEqual({ ok: true });

            expect(result[1]).toEqual({
              id: 'new_denied_contact_1',
              error: 'forbidden',
            });
            expect(result[2]).toEqual({
              id: 'denied_contact_1',
              error: 'forbidden',
            });
            expect(result[3]).toEqual({
              id: 'denied_contact_2',
              error: 'forbidden',
            });
            expect(result[4]).toEqual({
              id: 'allowed_contact_1',
              error: 'forbidden',
            });
            expect(result[6]).toEqual({ error: 'forbidden' });

            ids = result.map(r => r.id).filter(id => id);

            return Promise.all(
              result.map(row => utils.getDoc(row.id).catch(err => err)),
            );
          }).then(result => {
            expect(result.length).toEqual(8);
            expect(_.omit(result[0], '_rev')).toEqual(docs[0]);
            expect(result[1].responseBody.error).toEqual('not_found');
            expect(_.omit(result[2], '_rev')).toEqual(existentDocs[2]);
            expect(_.omit(result[3], '_rev')).toEqual(existentDocs[3]);
            expect(_.omit(result[4], '_rev')).toEqual(existentDocs[0]);
            expect(_.omit(result[5], '_rev')).toEqual(_.omit(docs[5], '_rev'));
            expect(result[6].responseBody.error).toEqual('not_found');
            expect(_.omit(result[7], '_rev', '_id')).toEqual(docs[7]);

            return sUtils.waitForSentinel(ids).then(() => sUtils.getInfoDocs(ids));
          }).then(result => {
            expect(result.length).toEqual(7);
            // Successful new write
            expect(result[0]._id).toEqual('new_allowed_contact_1-info');

            // Unsuccessful new write
            expect(result[1]).not.toBeDefined();

            // Unsuccessful writes to existing
            expect(_.pick(result[2], '_id', 'latest_replication_date')).toEqual(_.pick(existentDocsInfodocs[2], '_id', 'latest_replication_date'));
            expect(_.pick(result[3], '_id', 'latest_replication_date')).toEqual(_.pick(existentDocsInfodocs[3], '_id', 'latest_replication_date'));
            expect(_.pick(result[4], '_id', 'latest_replication_date')).toEqual(_.pick(existentDocsInfodocs[0], '_id', 'latest_replication_date'));

            // Successful write to existing
            expect(result[5]._id).toEqual(existentDocsInfodocs[1]._id);
            expect(result[5].latest_replication_date).not.toEqual(existentDocsInfodocs[1].latest_replication_date);

            // Successful completely new write
            expect(result[6]).toBeDefined();
          });
    });
  });

  it('reiterates over docs', () => {
    const docs = [
      {
        _id: 'allowed_1',
        type: 'data_record',
        reported_date: 1,
        place_id: 'a',
        form: 'some-form',
        contact: { _id: 'b' },
      },
      {
        _id: 'denied_1',
        type: 'data_record',
        reported_date: 1,
        place_id: 'c',
        form: 'some-form',
        contact: { _id: 'b' },
      },
      {
        _id: 'allowed_2',
        type: 'data_record',
        reported_date: 1,
        form: 'some-form',
        contact: { _id: 'allowed_4' },
      },
      {
        _id: 'denied_2',
        type: 'data_record',
        reported_date: 1,
        form: 'some-form',
        contact: { _id: 'denied_4' },
      },
      {
        _id: 'allowed_3',
        type: 'clinic',
        place_id: 'a',
        parent: { _id: 'fixture:offline' },
      },
      {
        _id: 'allowed_4',
        type: 'clinic',
        place_id: 'b',
        parent: { _id: 'fixture:offline' },
      },
      {
        _id: 'denied_3',
        type: 'clinic',
        place_id: 'c',
        parent: { _id: 'fixture:online' },
      },
      {
        _id: 'denied_4',
        type: 'clinic',
        place_id: 'd',
        parent: { _id: 'fixture:online' },
      },
    ];
    offlineRequestOptions.body = JSON.stringify({ docs: docs });

    return utils.requestOnTestDb(offlineRequestOptions).then(result => {
      expect(result.length).toEqual(8);
      expect(_.pick(result[0], 'ok', 'id')).toEqual({
        ok: true,
        id: 'allowed_1',
      });
      expect(_.pick(result[2], 'ok', 'id')).toEqual({
        ok: true,
        id: 'allowed_2',
      });
      expect(_.pick(result[4], 'ok', 'id')).toEqual({
        ok: true,
        id: 'allowed_3',
      });
      expect(_.pick(result[5], 'ok', 'id')).toEqual({
        ok: true,
        id: 'allowed_4',
      });

      expect(result[1]).toEqual({ id: 'denied_1', error: 'forbidden' });
      expect(result[3]).toEqual({ id: 'denied_2', error: 'forbidden' });
      expect(result[6]).toEqual({ id: 'denied_3', error: 'forbidden' });
      expect(result[7]).toEqual({ id: 'denied_4', error: 'forbidden' });
    });
  });

  it('filters offline users requests when db name is not medic', () => {
    const existentDocs = [
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 1',
      },
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2',
      },
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1',
      },
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 2',
      },
    ];

    const docs = [
      {
        _id: 'new_allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact',
      },
      {
        _id: 'new_denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact',
      },
      // disallowed update on disallowed doc
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1 updated',
      },
      // allowed update on disallowed doc
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Denied Contact 2 updated',
      },
      // disallowed update on allowed doc
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Allowed Contact 1 updated',
      },
      // allowed update on allowed doc
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2 updated',
      },
      // no _id field disallowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact With no ID',
      },
      // no _id field allowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact With no ID',
      },
    ];

    return utils
      .saveDocs(existentDocs)
      .then(result => {
        result.forEach(
          row => (docs.find(doc => doc._id === row.id)._rev = row.rev)
        );
        offlineRequestOptions.body = JSON.stringify({ docs: docs });
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.length).toEqual(8);
        expect(_.pick(result[0], 'ok', 'id')).toEqual({ ok: true, id: 'new_allowed_contact_2' });
        expect(_.pick(result[5], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_contact_2' });
        expect(_.pick(result[7], 'ok')).toEqual({ ok: true });

        expect(result[1]).toEqual({ id: 'new_denied_contact_2', error: 'forbidden' });
        expect(result[2]).toEqual({ id: 'denied_contact_1', error: 'forbidden' });
        expect(result[3]).toEqual({ id: 'denied_contact_2', error: 'forbidden' });
        expect(result[4]).toEqual({ id: 'allowed_contact_1', error: 'forbidden' });
        expect(result[6]).toEqual({ error: 'forbidden' });

        return Promise.all(result.map(row => utils.getDoc(row.id).catch(err => err)));
      })
      .then(results => {
        expect(results.length).toEqual(8);
        expect(_.omit(results[0], '_rev')).toEqual(docs[0]);
        expect(results[1].responseBody.error).toEqual('not_found');
        expect(_.omit(results[2], '_rev')).toEqual(existentDocs[2]);
        expect(_.omit(results[3], '_rev')).toEqual(existentDocs[3]);
        expect(_.omit(results[4], '_rev')).toEqual(existentDocs[0]);
        expect(_.omit(results[5], '_rev')).toEqual(_.omit(docs[5], '_rev'));
        expect(results[6].responseBody.error).toEqual('not_found');
        expect(_.omit(results[7], '_rev', '_id')).toEqual(docs[7]);
      });
  });

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = {
      _id: 'denied_report',
      contact: { _id: 'fixture:online' },
      type: 'data_record',
      form: 'a',
    };
    offlineRequestOptions.body = JSON.stringify({ docs: [doc] });

    return Promise.all([
      utils.requestOnTestDb(_.defaults({ path: '/_bulk_docs' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '///_bulk_docs//' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_docs` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '/_bulk_docs/something' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '///_bulk_docs//something' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_docs/something` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '/_bulk_docs' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '///_bulk_docs//' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//medic//_bulk_docs` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '/_bulk_docs/something' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '///_bulk_docs//something' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//medic//_bulk_docs/something` }, offlineRequestOptions))
        .catch(err => err),
    ]).then(results => {
      expect(
        results.every(result => {
          if (_.isArray(result)) {
            return (
              result.length === 1 &&
              result[0].id === 'denied_report' &&
              result[0].error === 'forbidden'
            );
          }

          // CouchDB interprets this as an attachment POST request
          return result.responseBody.error === 'method_not_allowed';
        })
      ).toBe(true);
    });
  });

  it('works with `new_edits`', () => {
    const docs = [
      {
        _id: 'allowed',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'allowed-1',
      },
      {
        _id: 'denied',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'denied-1',
      },
    ];

    offlineRequestOptions.body = JSON.stringify({
      docs: docs,
      new_edits: false,
    });
    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        expect(result).toEqual([]);
        return Promise.all([
          utils.getDoc('allowed'),
          utils.getDoc('denied').catch(err => err),
        ]);
      })
      .then(results => {
        expect(results[0]).toEqual(docs[0]);
        expect(results[1].statusCode).toEqual(404);
      });
  });

  it('allows offline user creation of feedback docs', () => {
    const docs = [
      { _id: 'fb1', type: 'feedback', content: 'feedback1' },
      { _id: 'fb2', type: 'feedback', content: 'feedback2' },
    ];

    offlineRequestOptions.body = JSON.stringify({ docs: docs });
    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        expect(result.length).toEqual(2);
        expect(_.omit(result[0], 'rev')).toEqual({ ok: true, id: 'fb1' });
        expect(_.omit(result[1], 'rev')).toEqual({ ok: true, id: 'fb2' });
        return Promise.all([utils.getDoc('fb1'), utils.getDoc('fb2')]);
      })
      .then(results => {
        expect(_.omit(results[0], '_rev')).toEqual(docs[0]);
        expect(_.omit(results[1], '_rev')).toEqual(docs[1]);
      });
  });

  it('does not allow offline users updates of feedback docs', () => {
    const docs = [
      { _id: 'fb1', type: 'feedback', content: 'feedback1' },
      { _id: 'fb2', type: 'feedback', content: 'feedback2' },
    ];

    return utils
      .saveDocs(docs)
      .then(result => {
        result.forEach((row, idx) => {
          docs[idx]._rev = row.rev;
          docs[idx].content += 'update';
        });

        offlineRequestOptions.body = JSON.stringify({ docs: docs });
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result).toEqual([
          { id: 'fb1', error: 'forbidden' },
          { id: 'fb2', error: 'forbidden' },
        ]);
        return Promise.all([utils.getDoc('fb1'), utils.getDoc('fb2')]);
      })
      .then(results => {
        expect(results[0].content).toEqual('feedback1');
        expect(results[0]._rev).toEqual(docs[0]._rev);

        expect(results[1].content).toEqual('feedback2');
        expect(results[1]._rev).toEqual(docs[1]._rev);
      });
  });
});
