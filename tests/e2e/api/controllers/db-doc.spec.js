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
          expect(_.omit(results[0], '_rev')).toEqual(
            { _id: 'db_doc_post', type: 'district_hospital', name: 'NEW PLACE' });
          expect(results[1].history.length).toEqual(1);
          expect(_.pick(results[1].history[0], 'user', 'action')).toEqual({ user: 'online', action: 'create' });
          expect(results[1].history[0].doc).toEqual(
            { _id: 'db_doc_post', type: 'district_hospital', name: 'NEW PLACE', _rev: 'current' });
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
          expect(_.omit(results[1].history[0].doc, '_rev')).toEqual(
            { _id: 'db_doc_put', type: 'clinic', name: 'my clinic' });
          expect(_.pick(results[1].history[1], 'user', 'action')).toEqual({ user: 'online', action: 'update' });
          expect(_.omit(results[1].history[1].doc, '_rev')).toEqual(
            { _id: 'db_doc_put', type: 'clinic', name: 'my updated clinic' });
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

  describe('restricts offline users', () => {
    it('GET', () => {
      offlineRequestOptions.method = 'GET';

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/fixture:user:offline' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/fixture:user:online' }, offlineRequestOptions)).catch(err => err)
        ])
        .then(results => {
          expect(_.omit(results[0], '_rev', 'reported_date')).toEqual({
            _id: 'fixture:user:offline',
            name: 'OfflineUser',
            type: 'person',
            parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' }}
          });

          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });
        });
    });

    it('POST', () => {
      _.extend(offlineRequestOptions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const allowedDoc = { _id: 'allowed_doc_post', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'allowed' },
            deniedDoc = { _id: 'denied_doc_post', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied' };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ body: JSON.stringify(allowedDoc), path: '/' }, offlineRequestOptions)),
          utils
            .requestOnTestDb(_.defaults({ body: JSON.stringify(deniedDoc), path: '/' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/' }, offlineRequestOptions))
            .catch(err => err)
        ])
        .then(results => {
          expect(_.omit(results[0], 'rev')).toEqual({ id: 'allowed_doc_post', ok: true });
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });
          expect(results[2].responseBody.error).toEqual('forbidden');

          return Promise.all([
            utils.getDoc('allowed_doc_post'),
            utils.getAuditDoc('allowed_doc_post'),
            utils.getDoc('denied_doc_post').catch(err => err),
            utils.getAuditDoc('denied_doc_post').catch(err => err),
          ]);
        })
        .then(results => {
          expect(_.omit(results[0], '_rev')).toEqual(allowedDoc);
          expect(results[1].history.length).toEqual(1);
          expect(_.pick(results[1].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
          expect(results[1].history[0].doc).toEqual(_.extend({ _rev: 'current' }, allowedDoc));

          expect(results[2].statusCode).toEqual(404);
          expect(results[3].statusCode).toEqual(404);
        });
    });

    it('PUT', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const docs = [
        { _id: 'a_put_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'a1' },
        { _id: 'a_put_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'a2' },
        { _id: 'd_put_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'd1' },
        { _id: 'd_put_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'd2' }
      ];

      return utils
        .saveDocs(docs)
        .then(results => {
          results.forEach((result, idx) => docs[idx]._rev = result.rev);

          const updates = [
            { _id: 'n_put_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'n1' }, // new allowed
            { _id: 'n_put_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'n2' }, // new denied
            _.defaults({ name: 'a1 updated' }, docs[0]), // stored allowed, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' }}, docs[1]), // stored allowed, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // stored denied, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' }}, docs[3]) // stored denied, new allowed
          ];

          return Promise.all(updates.map(doc =>
            utils
              .requestOnTestDb(_.extend({ path: `/${doc._id}`, body: JSON.stringify(doc)}, offlineRequestOptions))
              .catch(err => err)
          ));
        })
        .then(results => {
          expect(_.omit(results[0], 'rev')).toEqual({ ok: true, id: 'n_put_1' });
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });
          expect(_.omit(results[2], 'rev')).toEqual({ ok: true, id: 'a_put_1' });
          expect(results[3].statusCode).toEqual(403);
          expect(results[3].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });
          expect(results[4].statusCode).toEqual(403);
          expect(results[4].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });
          expect(results[5].statusCode).toEqual(403);
          expect(results[5].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });

          return Promise.all([
            utils.getAuditDoc('n_put_1'),
            utils.getAuditDoc('n_put_2').catch(err => err),
            ...docs.map(doc => utils.getAuditDoc(doc._id))
          ]);
        })
        .then(results => {
          // new allowed
          expect(results[0].history.length).toEqual(1);
          expect(_.pick(results[0].history[0], 'user', 'action')).toEqual({ user: 'offline', action: 'create' });
          expect(results[0].history[0].doc).toEqual(
            { _id: 'n_put_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'n1', _rev: 'current' });

          // new denied
          expect(results[1].statusCode).toEqual(404);

          // stored allowed, new allowed
          expect(results[2].history.length).toEqual(2);
          expect(_.pick(results[2].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
          expect(_.pick(results[2].history[1], 'user', 'action')).toEqual({ user: 'offline', action: 'update' });
          expect(results[2].history[0].doc.name).toEqual('a1');
          expect(results[2].history[1].doc.name).toEqual('a1 updated');

          // stored allowed, new denied
          expect(results[3].history.length).toEqual(1);
          expect(_.pick(results[3].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
          expect(results[3].history[0].doc.name).toEqual('a2');

          // stored denied, new denied
          expect(results[4].history.length).toEqual(1);
          expect(_.pick(results[4].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
          expect(results[4].history[0].doc.name).toEqual('d1');

          // stored denied, new allowed
          expect(results[5].history.length).toEqual(1);
          expect(_.pick(results[5].history[0], 'user', 'action')).toEqual({ user: 'admin', action: 'create' });
          expect(results[5].history[0].doc.name).toEqual('d2');
        });
    });

    it('DELETE', () => {
      offlineRequestOptions.method = 'DELETE';

      return utils
        .saveDocs([
          { _id: 'allowed_del', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'allowed' },
          { _id: 'denied_del', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied' }
        ])
        .then(results => Promise.all([
          utils.requestOnTestDb(_.extend({ path: `/allowed_del?rev=${results[0].rev}` }, offlineRequestOptions)),
          utils
            .requestOnTestDb(_.extend({ path: `/denied_del?rev=${results[1].rev}` }, offlineRequestOptions))
            .catch(err => err)
        ]))
        .then(results => {
          expect(_.omit(results[0], 'rev')).toEqual({ id: 'allowed_del', ok: true });
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });

          return Promise.all([
            utils.getDoc('allowed_del').catch(err => err),
            utils.getDoc('denied_del')
          ]);
        })
        .then(results => {
          expect(results[0].statusCode).toEqual(404);
          expect(results[0].responseBody).toEqual({ error: 'not_found', reason: 'deleted' });

          expect(_.omit(results[1], '_rev')).toEqual(
            { _id: 'denied_del', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied' });
        });
    });

    it('GET attachment', () => {
      const revs = {
        'allowed_attach': [],
        'denied_attach': []
      };

      return utils
        .saveDocs([
          { _id: 'allowed_attach', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'allowed attach'},
          { _id: 'denied_attach', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied attach'},
        ])
        .then(results => Promise.all(results.map(result => {
          revs[result.id].push(result.rev);
          return utils.requestOnTestDb({
            path: `/${result.id}/att_name?rev=${result.rev}`,
            method: 'PUT',
            body: 'my attachment content',
            headers: { 'Content-Type': 'text/plain' }
          });
        })))
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils
              .requestOnTestDb(_.extend({ path: '/allowed_attach/att_name' }, offlineRequestOptions), false, true),
            utils
              .requestOnTestDb(_.extend({ path: '/denied_attach/att_name' }, offlineRequestOptions))
              .catch(err => err)
          ]);
        })
        .then(results => {
          expect(results[0]).toEqual('my attachment content');
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });

          return Promise.all([
            utils.getDoc('allowed_attach'),
            utils.getDoc('denied_attach')
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            _.extend(results[0], {  parent: { _id: 'fixture:online' } }),
            _.extend(results[1], {  parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          return Promise.all(_.flatten(_.map(revs, (revisions, id) => {
            return revisions.map(rev =>
              utils
                .requestOnTestDb(_.extend({ path: `/${id}/att_name?rev=${rev}` }, offlineRequestOptions), false, true)
                .catch(err => err)
            );
          })));
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          expect(JSON.parse(results[0])).toEqual({ error: 'not_found', reason: 'Document is missing attachment' });
          // allowed_attach is allowed and has attachment
          expect(results[1]).toEqual('my attachment content');
          // allowed_attach is not allowed and has attachment
          expect(JSON.parse(results[2]).error).toEqual('forbidden');

          // denied_attach is not allowed, but missing attachment
          expect(JSON.parse(results[3]).error).toEqual('forbidden');
          // denied_attach is not allowed and has attachment
          expect(JSON.parse(results[4]).error).toEqual('forbidden');
          // denied_attach is allowed and has attachment
          expect(results[5]).toEqual('my attachment content');
        });
    });

    it('GET attachment with name containing slashes', () => {
      const revs = {
        'allowed_attach_1': [],
        'denied_attach_1': []
      };

      return utils
        .saveDocs([
          { _id: 'allowed_attach_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'allowed attach'},
          { _id: 'denied_attach_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied attach'},
        ])
        .then(results => Promise.all(results.map(result => {
          revs[result.id].push(result.rev);
          return utils.requestOnTestDb({
            path: `/${result.id}/att_name/1/2/3/etc?rev=${result.rev}`,
            method: 'PUT',
            body: 'my attachment content',
            headers: { 'Content-Type': 'text/plain' }
          });
        })))
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils
              .requestOnTestDb(_.extend({ path: '/allowed_attach_1/att_name/1/2/3/etc' }, offlineRequestOptions), false, true),
            utils
              .requestOnTestDb(_.extend({ path: '/denied_attach_1/att_name/1/2/3/etc' }, offlineRequestOptions))
              .catch(err => err)
          ]);
        })
        .then(results => {
          expect(results[0]).toEqual('my attachment content');
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });

          return Promise.all([
            utils.getDoc('allowed_attach_1'),
            utils.getDoc('denied_attach_1')
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            _.extend(results[0], {  parent: { _id: 'fixture:online' } }),
            _.extend(results[1], {  parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          return Promise.all(_.flatten(_.map(revs, (revisions, id) => {
            return revisions.map(rev =>
              utils
                .requestOnTestDb(_.extend({ path: `/${id}/att_name/1/2/3/etc?rev=${rev}` }, offlineRequestOptions), false, true)
                .catch(err => err)
            );
          })));
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          expect(JSON.parse(results[0])).toEqual({ error: 'not_found', reason: 'Document is missing attachment' });
          // allowed_attach is allowed and has attachment
          expect(results[1]).toEqual('my attachment content');
          // allowed_attach is not allowed and has attachment
          expect(JSON.parse(results[2]).error).toEqual('forbidden');

          // denied_attach is not allowed, but missing attachment
          expect(JSON.parse(results[3]).error).toEqual('forbidden');
          // denied_attach is not allowed and has attachment
          expect(JSON.parse(results[4]).error).toEqual('forbidden');
          // denied_attach is allowed and has attachment
          expect(results[5]).toEqual('my attachment content');
        });
    });

    it('PUT attachment', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'my new attachment content'
      });

      return utils
        .saveDocs([
          { _id: 'a_with_attachments', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'allowed attach'},
          { _id: 'd_with_attachments', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'denied attach'},
        ])
        .then(results => Promise.all(results.map(result =>
          utils
            .requestOnTestDb(_.extend({ path: `/${result.id}/new_attachment?rev=${result.rev}`}, offlineRequestOptions))
            .catch(err => err)
        )))
        .then(results => {
          expect(_.omit(results[0], 'rev')).toEqual({ ok: true, id: 'a_with_attachments' });
          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody).toEqual({ error: 'forbidden', reason: 'Insufficient privileges' });

          return Promise.all([
            utils.requestOnTestDb({ path: '/a_with_attachments' }),
            utils.requestOnTestDb({ path: '/a_with_attachments/new_attachment' }, false, true),
            utils.requestOnTestDb({ path: '/d_with_attachments' }),
            utils.requestOnTestDb({ path: '/d_with_attachments/new_attachment' }).catch(err => err)
          ]);
        })
        .then(results => {
          expect(results[0]._attachments.new_attachment).toBeTruthy();
          expect(results[0]._id).toEqual('a_with_attachments');

          expect(results[1]).toEqual('my new attachment content');

          expect(results[2]._attachments).not.toBeTruthy();
          expect(results[2]._id).toEqual('d_with_attachments');

          expect(results[3].responseBody.error).toEqual('not_found');
        });
    });
  });

  it('restricts calls with irregular urls which match couchdb endpoints', () => {
    const doc = { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' };

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils
          .requestOnTestDb(_.defaults({ path: '/denied_report' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///denied_report//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/dsada` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '/denied_report/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///denied_report//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/something` }, offlineRequestOptions))
          .catch(err => err)
      ]))
      .then(results => {
        expect(results.every(result => result.statusCode === 403)).toBe(true);
      });
  });

  it('allows creation of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    _.extend(offlineRequestOptions, {
      path: '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });

    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        expect(_.omit(result, 'rev')).toEqual({ id: 'fb1', ok: true });
        return utils.getDoc('fb1');
      })
      .then(result => {
        expect(_.omit(result, '_rev')).toEqual(doc);
      });
  });

  it('does not allow updates of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    return utils
      .saveDoc(doc)
      .then(result => {
        doc._rev = result.rev;
        doc.content = 'new content';

        _.extend(offlineRequestOptions, {
          method: 'PUT',
          path: '/fb1',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc)
        });
        return utils.requestOnTestDb(offlineRequestOptions).catch(err => err);
      })
      .then(result => {
        expect(result.responseBody.error).toEqual('forbidden');
        expect(result.statusCode).toEqual(403);
        return utils.getDoc('fb1');
      })
      .then(result => {
        expect(result._rev).toEqual(doc._rev);
        expect(result.content).toEqual('content');
      });
  });

  describe('interactions with ddocs', () => {
    it('allows GETting _design/medic-client, blocks all other ddoc GET requests', () => {
      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, offlineRequestOptions)).catch(err => err),
        ])
        .then(results => {
          expect(results[0]._id).toEqual('_design/medic-client');

          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody.error).toEqual('forbidden');

          expect(results[2].statusCode).toEqual(403);
          expect(results[2].responseBody.error).toEqual('forbidden');
        });
    });

    it('blocks PUTting any ddoc', () => {
      const request = {
        method: 'PUT',
        body: JSON.stringify({ some: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise
        .all([
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions))
            .catch(err => err),
        ])
        .then(results => {
          expect(results[0].statusCode).toEqual(403);
          expect(results[0].responseBody.error).toEqual('forbidden');

          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody.error).toEqual('forbidden');

          expect(results[2].statusCode).toEqual(403);
          expect(results[2].responseBody.error).toEqual('forbidden');
        });
    });

    it('blocks DELETEing any ddoc', () => {
      const request = {
        method: 'DELETE'
      };

      return Promise
        .all([
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions))
            .catch(err => err),
        ])
        .then(results => {
          expect(results[0].statusCode).toEqual(403);
          expect(results[0].responseBody.error).toEqual('forbidden');

          expect(results[1].statusCode).toEqual(403);
          expect(results[1].responseBody.error).toEqual('forbidden');

          expect(results[2].statusCode).toEqual(403);
          expect(results[2].responseBody.error).toEqual('forbidden');
        });
    });
  });
});
