const _ = require('underscore'),
      utils = require('../../../utils');

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
      path: '/_bulk_docs',
      auth: `offline:${password}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    onlineRequestOptions = {
      path: '/_bulk_docs',
      auth: `online:${password}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
  });

  it('does not filter docs for online users', () => {
    const docs = [
      { _id: 'NEW_PARENT_PLACE', type: 'district_hospital', name: 'New Hospital' },
      { _id: 'NEW_CONTACT', parent: { _id: 'NEW_PARENT_PLACE'}, type: 'person', name: 'New Contact', reported_date: 1 },
      { _id: 'ICanBeAnything' }
    ];

    onlineRequestOptions.body = JSON.stringify({ docs: docs });

    return utils
      .requestOnTestDb(onlineRequestOptions)
      .then(result => {
        expect(result.length).toEqual(3);
        expect(result.every(row => row.ok)).toBe(true);

        return Promise.all(result.map(row => utils.getAuditDoc(row.id)));
      })
      .then(results => {
        expect(results.every(result => result.history.length === 1)).toBe(true);
        expect(results.every(result => result.history[0].action === 'create' && result.history[0].user === 'online'));

        return Promise.all(docs.map(doc => utils.getDoc(doc._id)));
      })
      .then(results => {
        results.forEach((result, idx) => expect(_.omit(result, '_rev')).toEqual(docs[idx]));
      });
  });

  it('filters offline users requests', () => {
    const existentDocs = [
      { _id: 'allowed_contact_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'allowed_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'denied_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'denied_contact_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    const docs = [
      { _id: 'new_allowed_contact', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'New Allowed Contact' },
      { _id: 'new_denied_contact', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'New Denied Contact' },
      // disallowed update on disallowed doc
      { _id: 'denied_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1 updated' },
      // allowed update on disallowed doc
      { _id: 'denied_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Denied Contact 2 updated' },
      // disallowed update on allowed doc
      { _id: 'allowed_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Allowed Contact 1 updated' },
      // allowed update on allowed doc
      { _id: 'allowed_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2 updated' },
      // no _id field disallowed doc
      { type: 'clinic', parent: { _id: 'fixture:online' }, name: 'New Denied Contact With no ID' },
      // no _id field allowed doc
      { type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'New Allowed Contact With no ID' },
    ];

    return utils
      .saveDocs(existentDocs)
      .then(result => {
        result.forEach(row => docs.find(doc => doc._id === row.id)._rev = row.rev);
        offlineRequestOptions.body = JSON.stringify({ docs: docs });
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        expect(result.length).toEqual(8);
        expect(_.pick(result[0], 'ok', 'id')).toEqual({ ok: true, id: 'new_allowed_contact' });
        expect(_.pick(result[5], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_contact_2' });
        expect(_.pick(result[7], 'ok')).toEqual({ ok: true });

        expect(result[1]).toEqual({ id: 'new_denied_contact', error: 'forbidden' });
        expect(result[2]).toEqual({ id: 'denied_contact_1', error: 'forbidden' });
        expect(result[3]).toEqual({ id: 'denied_contact_2', error: 'forbidden' });
        expect(result[4]).toEqual({ id: 'allowed_contact_1', error: 'forbidden' });
        expect(result[6]).toEqual({ error: 'forbidden' });

        return Promise.all(result.map(row =>
          utils
            .getDoc(row.id)
            .catch(err => err)
        ));
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

        return Promise.all(results.map(row =>
          utils
            .getAuditDoc(row._id)
            .catch(err => err)
        ));
      })
      .then(results => {
        // created
        expect(results[0]._id).toEqual('new_allowed_contact-audit');
        expect(results[0].history.length).toEqual(1);
        expect(_.pick(results[0].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(results[0].history[0].doc).toEqual(_.extend(docs[0], { _rev: 'current' }));

        // not created
        expect(results[1].responseBody.error).toEqual('not_found');

        // not updated
        expect(results[2]._id).toEqual('denied_contact_1-audit');
        expect(results[2].history.length).toEqual(1);
        expect(_.pick(results[2].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });

        // not updated
        expect(results[3]._id).toEqual('denied_contact_2-audit');
        expect(results[3].history.length).toEqual(1);
        expect(_.pick(results[3].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });

        // not updated
        expect(results[4]._id).toEqual('allowed_contact_1-audit');
        expect(results[4].history.length).toEqual(1);
        expect(_.pick(results[4].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });

        // updated
        expect(results[5]._id).toEqual('allowed_contact_2-audit');
        expect(results[5].history.length).toEqual(2);
        expect(_.pick(results[5].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
        expect(_.pick(results[5].history[1], 'user', 'action')).toEqual({ user: 'offline', action: 'update' });
        expect(results[5].history[0].doc.name).toEqual('Allowed Contact 2');
        expect(results[5].history[1].doc.name).toEqual('Allowed Contact 2 updated');

        // not created
        expect(results[6].responseBody.error).toEqual('not_found');

        // created
        expect(results[7].history.length).toEqual(1);
        expect(_.pick(results[7].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(_.omit(results[7].history[0].doc, '_id', '_rev')).toEqual(docs[7]);
      });
  });

  it('reiterates over docs', () => {
    const docs = [
      { _id: 'allowed_1', type: 'data_record', reported_date: 1, place_id: 'a', form: 'some-form', contact: { _id: 'b' }},
      { _id: 'denied_1', type: 'data_record', reported_date: 1, place_id: 'c', form: 'some-form', contact: { _id: 'b' }},
      { _id: 'allowed_2', type: 'data_record', reported_date: 1, form: 'some-form', contact: { _id: 'allowed_4' }},
      { _id: 'denied_2', type: 'data_record', reported_date: 1, form: 'some-form', contact: { _id: 'denied_4' }},
      { _id: 'allowed_3', type: 'clinic', place_id: 'a', parent: { _id: 'fixture:offline'}},
      { _id: 'allowed_4', type: 'clinic', place_id: 'b', parent: { _id: 'fixture:offline'}},
      { _id: 'denied_3', type: 'clinic', place_id: 'c', parent: { _id: 'fixture:online'}},
      { _id: 'denied_4', type: 'clinic', place_id: 'd', parent: { _id: 'fixture:online'}},
    ];
    offlineRequestOptions.body = JSON.stringify({ docs: docs });

    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        expect(result.length).toEqual(8);
        expect(_.pick(result[0], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_1' });
        expect(_.pick(result[2], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_2' });
        expect(_.pick(result[4], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_3' });
        expect(_.pick(result[5], 'ok', 'id')).toEqual({ ok: true, id: 'allowed_4' });

        expect(result[1]).toEqual({ id: 'denied_1', error: 'forbidden' });
        expect(result[3]).toEqual({ id: 'denied_2', error: 'forbidden' });
        expect(result[6]).toEqual({ id: 'denied_3', error: 'forbidden' });
        expect(result[7]).toEqual({ id: 'denied_4', error: 'forbidden' });

        return Promise.all(result.map(row =>
          utils
            .getAuditDoc(row.id)
            .catch(err => err)
        ));
      })
      .then(results => {
        // created
        expect(results[0]._id).toEqual('allowed_1-audit');
        expect(results[0].history.length).toEqual(1);
        expect(_.pick(results[0].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(results[0].history[0].doc).toEqual(_.extend(docs[0], { _rev: 'current' }));

        // not created
        expect(results[1].responseBody.error).toEqual('not_found');

        // created
        expect(results[2]._id).toEqual('allowed_2-audit');
        expect(results[2].history.length).toEqual(1);
        expect(_.pick(results[2].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(results[2].history[0].doc).toEqual(_.extend(docs[2], { _rev: 'current' }));

        // not created
        expect(results[3].responseBody.error).toEqual('not_found');

        // created
        expect(results[4]._id).toEqual('allowed_3-audit');
        expect(results[4].history.length).toEqual(1);
        expect(_.pick(results[4].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(results[4].history[0].doc).toEqual(_.extend(docs[4], { _rev: 'current' }));

        // created
        expect(results[5]._id).toEqual('allowed_4-audit');
        expect(results[5].history.length).toEqual(1);
        expect(_.pick(results[5].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
        expect(results[5].history[0].doc).toEqual(_.extend(docs[5], { _rev: 'current' }));

        // not created
        expect(results[6].responseBody.error).toEqual('not_found');
        expect(results[7].responseBody.error).toEqual('not_found');
      });
  });
});
