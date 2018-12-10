const _ = require('underscore'),
  utils = require('../../utils'),
  constants = require('../../constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital',
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

const offlineRequestOptions = {
  auth: `offline:${password}`,
  method: 'GET',
};

const onlineRequestOptions = {
  auth: `online:${password}`,
  method: 'GET',
};

const unauthenticatedRequestOptions = {
  auth: '--------',
  method: 'GET',
  headers: { Accept: 'application/json' },
};

const DOCS_TO_KEEP = [
  'PARENT_PLACE',
  /^messages-/,
  /^fixture/,
  /^org.couchdb.user/,
];

describe('routing', () => {
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

  describe('unauthenticated routing', () => {
    it('API restricts endpoints which need authorization', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_view/someview' },
              unauthenticatedRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/explain' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/a/b/c' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/PARENT_PLACE' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/PARENT_PLACE/attachment' },
              unauthenticatedRequestOptions
            )
          )
          .catch(err => err),
        utils
          .request(
            _.extend({ path: '/some-new-db' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
      ]).then(results => {
        expect(
          results.every(
            result =>
              result.statusCode === 401 &&
              result.responseBody.error === 'unauthorized'
          )
        );
      });
    });

    it('API allows endpoints which do not need authentication', () => {
      return Promise.all([
        utils.requestOnTestDb(
          _.extend({ path: '/login' }, unauthenticatedRequestOptions),
          false,
          true
        ),
        utils.request(
          _.extend({ path: '/login/style.css' }, unauthenticatedRequestOptions),
          { notJson: true }
        ),
        utils.request(
          _.extend({ path: '/api/v1/forms' }, unauthenticatedRequestOptions)
        ),
      ]).then(results => {
        expect(results[0].length).toBeTruthy();
        expect(results[1].length).toBeTruthy();
        expect(_.isArray(results[2])).toEqual(true);
      });
    });
  });

  describe('offline users routing', () => {
    it('restricts _design/*/_list/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_list/test_list/test_view' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '///_design///medic//_list//test_list/test_view' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              {
                path: `//${
                  constants.DB_NAME
                }//_design//medic//_list//test_list/test_view`,
              },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_list/test_list/test_view' },
              onlineRequestOptions
            )
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].statusCode).toEqual(404);
        expect(results[3].responseBody.error).toEqual('not_found');
      });
    });

    it('restricts _design/*/_show/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_show/test' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '///_design///medic//_show//test' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_design//medic//_show//test/` },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_show/test' },
              onlineRequestOptions
            )
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].statusCode).toEqual(404);
        expect(results[3].responseBody.error).toEqual('not_found');
      });
    });

    it('restricts _design/*/_view/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_view/test' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '///_design///medic//_view//test' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_design//medic//_view//test/` },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_design/medic/_view/test' },
              onlineRequestOptions
            )
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].statusCode).toEqual(404);
        expect(results[3].responseBody.error).toEqual('not_found');
      });
    });

    it('restricts _find', () => {
      const request = {
        method: 'POST',
        body: JSON.stringify({ selector: { type: 'person' }, limit: 1 }),
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend({ path: '/_find' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '///_find//' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_find//` },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/_find' }, onlineRequestOptions, request)
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].docs.length).toBeTruthy();
      });
    });

    it('restricts _explain', () => {
      const request = {
        method: 'POST',
        body: JSON.stringify({ selector: { type: 'person' }, limit: 1 }),
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend({ path: '/_explain' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '///_explain//' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_explain//` },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/_explain' }, onlineRequestOptions, request)
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].limit).toEqual(1);
        expect(results[3].fields).toEqual('all_fields');
      });
    });

    it('restricts _index', () => {
      return Promise.all([
        utils
          .requestOnTestDb(_.extend({ path: '/_index' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '///_index//' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_index//` },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_index' }, onlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].total_rows).toEqual(1);
        expect(results[3].indexes.length).toEqual(1);
      });
    });

    it('restricts _ensure_full_commit', () => {
      const request = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_ensure_full_commit' },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '///_ensure_full_commit//' },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_ensure_full_commit//` },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend(
              { path: '/_ensure_full_commit' },
              onlineRequestOptions,
              request
            )
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].ok).toEqual(true);
      });
    });

    it('restricts _security', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend({ path: '/_security' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '///_security//' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_security//` },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '/_security' }, onlineRequestOptions)
          )
          .catch(err => err),
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');

        expect(results[3].statusCode).toBeFalsy();
      });
    });

    it('restricts _purge', () => {
      const request = {
        method: 'POST',
        body: JSON.stringify({ 'some-fake-id': [] }),
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise.all([
        utils
          .requestOnTestDb(
            _.extend({ path: '/_purge' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(
            _.extend({ path: '///_purge//' }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_purge//` },
              offlineRequestOptions,
              request
            )
          )
          .catch(err => err)
      ]).then(results => {
        expect(results[0].statusCode).toEqual(403);
        expect(results[0].responseBody.error).toEqual('forbidden');

        expect(results[1].statusCode).toEqual(403);
        expect(results[1].responseBody.error).toEqual('forbidden');

        expect(results[2].statusCode).toEqual(403);
        expect(results[2].responseBody.error).toEqual('forbidden');
      });
    });

    it('allows _revs_diff, _missing_revs', () => {
      const request = {
        method: 'POST',
        body: JSON.stringify({ 'some-fake-id': [] }),
        headers: { 'Content-Type': 'application/json' },
      };

      return Promise.all([
        utils.requestOnTestDb(
          _.defaults({ path: '/_revs_diff' }, request, offlineRequestOptions)
        ),
        utils.requestOnTestDb(
          _.defaults({ path: '/_missing_revs' }, request, offlineRequestOptions)
        ),
      ]).then(results => {
        expect(results[0]).toEqual({});
        expect(results[1]).toEqual({ missing_revs: {} });
      });
    });

    it('allows _local', () => {
      const request = {
        method: 'PUT',
        body: JSON.stringify({ _id: 'some_local_id' }),
        headers: { 'Content-Type': 'application/json' },
        path: '/_local/some_local_id',
      };

      return utils
        .requestOnTestDb(_.defaults(request, offlineRequestOptions))
        .then(result => {
          expect(_.omit(result, 'rev')).toEqual({
            ok: true,
            id: '_local/some_local_id',
          });
          return utils.requestOnTestDb(
            _.defaults(
              { method: 'GET', path: '/_local/some_local_id' },
              offlineRequestOptions
            )
          );
        })
        .then(result => {
          expect(_.omit(result, '_rev')).toEqual({
            _id: '_local/some_local_id',
          });
          return utils.requestOnTestDb(
            _.defaults(
              { method: 'DELETE', path: '/_local/some_local_id' },
              offlineRequestOptions
            )
          );
        })
        .then(result => {
          expect(_.omit(result, 'rev')).toEqual({
            ok: true,
            id: '_local/some_local_id',
          });
        });
    });

    it('allows access to the app', () => {
      return Promise.all([
        utils.requestOnTestDb(
          _.defaults(
            { path: '/_design/medic/_rewrite' },
            offlineRequestOptions
          ),
          false,
          true
        ),
        utils.requestOnTestDb(
          _.defaults(
            { path: '/_design/medic/_rewrite/' },
            offlineRequestOptions
          ),
          false,
          true
        ),
        utils.requestOnTestDb(
          _.defaults(
            { path: '/_design/medic/_rewrite/css/inbox.css' },
            offlineRequestOptions
          ),
          false,
          true
        ),
      ]).then(results => {
        expect(results[0].includes('Found. Redirecting to')).toBe(true);
        expect(results[1].includes('DOCTYPE html')).toBe(true);
        expect(results[2].includes('html')).toBe(true);
      });
    });

    it('blocks access to the admin app', () => {
      return Promise
        .all([
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/_rewrite' }, offlineRequestOptions), false, true)
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/_rewrite/' }, offlineRequestOptions), false, true)
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/css/main.css' }, offlineRequestOptions), false, true)
            .catch(err => err)
        ])
        .then(results => {
          expect(results.every(result => result.statusCode === 401 && result.responseBody.error === 'unauthorized'));
        });
    });

    it('blocks direct access to CouchDB and to fauxton', () => {
      return Promise.all([
        utils
          .request(
            _.extend(
              { path: '/some-new-db', method: 'PUT' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .request(_.extend({ path: '/_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            _.extend({ path: '/_utils/something' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .request(_.extend({ path: '//_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: '//_utils//something/else' },
              offlineRequestOptions
            )
          )
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/a/b/c' }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        expect(
          results.every(
            result =>
              result.statusCode === 401 &&
              result.responseBody.error === 'unauthorized'
          )
        );
      });
    });
  });
});
