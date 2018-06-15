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

describe('db-doc handler', () => {
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
    offlineRequestOptions = { auth: `offline:${password}` };
    onlineRequestOptions = { auth: `online:${password}` };
  });

  describe('does not restrict online users', () => {
    it('GET', () => {
      _.extend(onlineRequestOptions, {
        method: 'GET',
        path: '/fixture:user:offline'
      });

      return utils
        .requestOnTestDb(onlineRequestOptions)
        .then(result => {
          expect(_.omit(result, '_rev', 'reported_date')).toEqual({
            _id: 'fixture:user:offline',
            name: 'OfflineUser',
            type: 'person',
            parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' }}
          });
        });
    });
  });

  it('POST', () => {
    _.extend(onlineRequestOptions, {
      path: '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: 'db_doc_post', type: 'district_hospital', name: 'NEW PLACE' })
    });

    return utils
      .requestOnTestDb(onlineRequestOptions)
      .then(result => {
        expect(_.omit(result, 'rev')).toEqual({ id: 'db_doc_post', ok: true });
        return Promise.all([
          utils.getDoc('db_doc_post'),
          utils.getAuditDoc('db_doc_post')
        ]);
      })
      .then(results => {
        expect(_.omit(results[0], '_rev')).toEqual({ _id: 'db_doc_post', type: 'district_hospital', name: 'NEW PLACE' });
        expect(results[1].history.length).toEqual(1);
        expect(_.pick(results[1].history[0], 'user', 'action')).toEqual({ user: 'online', action: 'create' });
        expect(results[1].history[0].doc).toEqual({ _id: 'db_doc_post', type: 'district_hospital', name: 'NEW PLACE', _rev: 'current' });
      });
  });

  it('PUT', () => {
    return utils
      .saveDoc({ _id: 'db_doc_put', type: 'clinic', name: 'my clinic' })
      .then(result => {
        _.extend(onlineRequestOptions, {
          method: 'PUT',
          path: '/db_doc_put',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: 'db_doc_put', type: 'clinic', name: 'my updated clinic', _rev: result.rev })
        });

        return utils.requestOnTestDb(onlineRequestOptions);
      })
      .then(result => {
        expect(_.omit(result, 'rev')).toEqual({ id: 'db_doc_put', ok: true });
        return Promise.all([
          utils.getDoc('db_doc_put'),
          utils.getAuditDoc('db_doc_put')
        ]);
      })
      .then(results => {
        expect(_.omit(results[0], '_rev')).toEqual({ _id: 'db_doc_put', type: 'clinic', name: 'my updated clinic' });
        expect(results[1].history.length).toEqual(2);
        expect(_.pick(results[1].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
        expect(_.omit(results[1].history[0].doc, '_rev')).toEqual({ _id: 'db_doc_put', type: 'clinic', name: 'my clinic' });
        expect(_.pick(results[1].history[1], 'user', 'action')).toEqual({ user: 'online', action: 'update' });
        expect(_.omit(results[1].history[1].doc, '_rev')).toEqual({ _id: 'db_doc_put', type: 'clinic', name: 'my updated clinic' });
      });
  });

  it('DELETE', () => {
    return utils
      .saveDoc({ _id: 'db_doc_delete', type: 'clinic', name: 'my clinic' })
      .then(result => {
        _.extend(onlineRequestOptions, {
          method: 'DELETE',
          path: `/db_doc_delete?rev=${result.rev}`,
          headers: { 'Content-Type': 'application/json' },
        });

        return utils.requestOnTestDb(onlineRequestOptions);
      })
      .then(result => {
        expect(_.omit(result, 'rev')).toEqual({ id: 'db_doc_delete', ok: true });
        return utils.getDoc('db_doc_delete');
      })
      .catch(err => {
        expect(err.responseBody.error).toEqual('not_found');
      });
  });

  it('GET attachment', () => {
    return utils
      .saveDoc({ _id: 'with_attachments' })
      .then(result => utils.requestOnTestDb({
        path: `/with_attachments/att_name?rev=${result.rev}`,
        method: 'PUT',
        body: 'my attachment content',
        headers: { 'Content-Type': 'text/plain' }
      }))
      .then(() => {
        onlineRequestOptions.path = '/with_attachments/att_name';
        return utils.requestOnTestDb(onlineRequestOptions, false, true);
      })
      .then(result => {
        expect(result).toEqual('my attachment content');
      });
  });

  it('PUT attachment', () => {
    return utils
      .saveDoc({ _id: 'with_attachments' })
      .then(result => {
        _.extend(onlineRequestOptions, {
          path: `/with_attachments/new_attachment?rev=${result.rev}`,
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: 'my new attachment content'
        });

        return utils.requestOnTestDb(onlineRequestOptions);
      })
      .then(result => utils.requestOnTestDb(`/with_attachments/new_attachment?rev=${result.rev}`, false, true))
      .then(result => {
        expect(result).toEqual('my new attachment content');
      });
  });
});
