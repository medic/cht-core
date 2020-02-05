const _ = require('lodash');
const utils = require('../../utils');
const constants = require('../../constants');

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
  auth: { username: 'offline', password },
  method: 'GET',
};

const onlineRequestOptions = {
  auth: { username: 'online', password },
  method: 'GET',
};

const unauthenticatedRequestOptions = {
  method: 'GET',
  noAuth: true
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
      .then(() => utils.createUsers(users))
      .then(done);
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users))
      .then(done));
  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));

  describe('unauthenticated routing', () => {
    it('API restricts endpoints which need authorization', () => {
      return Promise.all([
        utils
          .requestOnTestDb(
            Object.assign({ path: '/_design/medic/_view/someview' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/explain' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/a/b/c' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/PARENT_PLACE' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/PARENT_PLACE/attachment' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/some-new-db' }, unauthenticatedRequestOptions)) // 403
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_design/medic/_view/someview' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/explain' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/a/b/c' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/PARENT_PLACE' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/PARENT_PLACE/attachment' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/api/deploy-info' }, unauthenticatedRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach(result => {
          expect(result.statusCode).toEqual(401);
          expect(result.responseBody.error).toEqual('unauthorized');
        });
      });
    });

    it('API allows endpoints which do not need authentication', () => {
      return Promise.all([
        utils.requestOnTestDb(Object.assign({ path: '/login', json: false }, unauthenticatedRequestOptions)),
        utils.request(Object.assign({ path: '/login/style.css' }, unauthenticatedRequestOptions)),
        utils.request(Object.assign({ path: '/api/v1/forms' }, unauthenticatedRequestOptions)),
        utils.requestOnMedicDb(Object.assign({ path: '/login', json: false }, unauthenticatedRequestOptions)),
        utils.request(Object.assign({ path: '/setup/poll' }, unauthenticatedRequestOptions)),
        utils.request(Object.assign({ path: '/api/info' }, unauthenticatedRequestOptions)),
      ]).then(results => {
        expect(results[0].length).toBeTruthy();
        expect(results[1].length).toBeTruthy();
        expect(_.isArray(results[2])).toEqual(true);
        expect(results[3].length).toBeTruthy();
        expect(results[4].version).toEqual('0.1.0');
        expect(results[5].version).toEqual('0.1.0');
      });
    });

    it('should display deploy-info to authenticated users', () => {
      return Promise.all([
        utils.request(Object.assign({ path: '/api/deploy-info' }, onlineRequestOptions)),
        utils.request(Object.assign({ path: '/api/deploy-info' }, offlineRequestOptions)),
        utils.requestOnTestDb('/_design/medic-client')
      ]).then(([ deployInfoOnline, deployInfoOffline, ddoc ]) => {
        expect(deployInfoOnline).toEqual(ddoc.deploy_info);
        expect(deployInfoOffline).toEqual(ddoc.deploy_info);
      });
    });
  });

  describe('offline users routing', () => {
    it('restricts _design/*/_list/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(
            Object.assign({ path: '///_design///medic//_list//test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .request(Object.assign(
            { path: `//${constants.DB_NAME}//_design//medic//_list//test_list/test_view` },
            offlineRequestOptions
          ))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(
            Object.assign({ path: '///_design///medic//_list//test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .request(
            Object.assign({ path: `//medic//_design//medic//_list//test_list/test_view` }, offlineRequestOptions)
          )
          .catch(err => err)
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.statusCode).toEqual(404);
            expect(result.responseBody.error).toEqual('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _design/*/_show/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_show/test' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_show/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_design///medic//_show//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_show//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_design/medic/_show/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_design///medic//_show//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_design//medic//_show//test/` }, offlineRequestOptions))
          .catch(err => err),

      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.statusCode).toEqual(404);
            expect(result.responseBody.error).toEqual('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _design/*/_view/*', () => {
      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_view/test' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_design/medic/_view/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_design///medic//_view//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_view//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_design/medic/_view/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_design///medic//_view//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_view//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.statusCode).toEqual(404);
            expect(result.responseBody.error).toEqual('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _find', () => {
      const request = {
        method: 'POST',
        body: { selector: { type: 'person' }, limit: 1 },
      };

      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_find' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_find' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_find//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//${constants.DB_NAME}//_find//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_find' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_find//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_find//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.docs.length).toBeTruthy();
          } else {
            // offline user request
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _explain', () => {
      const request = {
        method: 'POST',
        body: { selector: { type: 'person' }, limit: 1 },
      };

      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_explain' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_explain' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_explain//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//${constants.DB_NAME}//_explain//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_explain' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_explain//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_explain//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.limit).toEqual(1);
            expect(result.fields).toEqual('all_fields');
          } else {
            // offline user requests
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _index', () => {
      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_index' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_index' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_index//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//${constants.DB_NAME}//_index//` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_index' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_index//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_index//` }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.total_rows).toEqual(1);
            expect(result.indexes.length).toEqual(1);
          } else {
            // offline user request
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _ensure_full_commit', () => {
      const request = {
        method: 'POST',
        body: {}
      };

      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_ensure_full_commit' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_ensure_full_commit' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_ensure_full_commit//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(
            Object.assign({ path: `//${constants.DB_NAME}//_ensure_full_commit//` }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_ensure_full_commit' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_ensure_full_commit//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_ensure_full_commit//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.ok).toEqual(true);
          } else {
            // offline user request
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _security', () => {
      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_security' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '/_security' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_security//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//${constants.DB_NAME}//_security//` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_security' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_security//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_security//` }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            expect(result.statusCode).toBeFalsy();
          } else {
            // offline user requests
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          }
        });
      });
    });

    it('restricts _purge', () => {
      const request = {
        method: 'POST',
        body: { 'some-fake-id': [] },
      };

      return Promise.all([
        utils
          .requestOnTestDb(Object.assign({ path: '/_purge' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(Object.assign({ path: '///_purge//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//${constants.DB_NAME}//_purge//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '/_purge' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDb(Object.assign({ path: '///_purge//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `//medic//_purge//` }, offlineRequestOptions, request))
          .catch(err => err)
      ]).then(results => {
        results.forEach(result => {
          expect(result.statusCode).toEqual(403);
          expect(result.responseBody.error).toEqual('forbidden');
        });
      });
    });

    it('allows _revs_diff, _missing_revs', () => {
      const request = {
        method: 'POST',
        body: { 'some-fake-id': [] },
      };

      return Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_revs_diff' }, request, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/_missing_revs' }, request, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/_revs_diff' }, request, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/_missing_revs' }, request, offlineRequestOptions)),
      ]).then(results => {
        expect(results[0]).toEqual({});
        expect(results[1]).toEqual({ missing_revs: {} });
        expect(results[2]).toEqual({});
        expect(results[3]).toEqual({ missing_revs: {} });
      });
    });

    it('allows _local', () => {
      const request = {
        method: 'PUT',
        body: { _id: 'some_local_id' },
        path: '/_local/some_local_id',
      };

      return utils
        .requestOnTestDb(_.defaults(request, offlineRequestOptions))
        .then(result => {
          expect(_.omit(result, 'rev')).toEqual({ ok: true, id: '_local/some_local_id' });
          return utils.requestOnTestDb(
            _.defaults({ method: 'GET', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          expect(_.omit(result, '_rev')).toEqual({ _id: '_local/some_local_id' });
          return utils.requestOnTestDb(
            _.defaults({ method: 'DELETE', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          expect(_.omit(result, 'rev')).toEqual({ ok: true, id: '_local/some_local_id' });
        });
    });

    it('allows access to the app', () => {
      return Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/', json: false }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions))
      ]).then(results => {
        expect(results[0].includes('This loads as an empty page')).toBe(true); // the dummy page that clears appcache
        expect(results[1].includes('DOCTYPE html')).toBe(true);
        expect(results[2].includes('This loads as an empty page')).toBe(true);
      });
    });

    it('blocks access to the admin app', () => {
      return Promise
        .all([
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/_rewrite' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/_rewrite/' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/_design/medic-admin/css/main.css' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDb(_.defaults({ path: '/_design/medic-admin/_rewrite' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDb(_.defaults({ path: '/_design/medic-admin/_rewrite/' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDb(_.defaults({ path: '/_design/medic-admin/css/main.css' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .request(Object.assign({ path: `/admin` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .request(Object.assign({ path: `/admin/` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .request(Object.assign({ path: `//admin//` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .request(Object.assign({ path: `/admin/css/main.css` }, offlineRequestOptions))
            .catch(err => err)
        ])
        .then(results => {
          results.forEach(result => {
            expect(result.statusCode).toEqual(403);
            expect(result.responseBody.error).toEqual('forbidden');
          });
        });
    });

    it('blocks direct access to CouchDB and to fauxton', () => {
      return Promise.all([
        utils
          .request(Object.assign({ path: '/some-new-db', method: 'PUT' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/_utils/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '//_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '//_utils//something/else' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/a/b/c' }, offlineRequestOptions))
          .catch(err => err)
      ]).then(results => {
        results.forEach(result => {
          expect(result.statusCode).toEqual(403);
          expect(result.responseBody.error).toEqual('forbidden');
        });
      });
    });
  });

  describe('legacy endpoints', () => {
    afterEach(done => utils.revertSettings().then(done));

    it('should still route to deprecate apiV0 settings endpoints', () => {
      let settings;
      return utils
        .updateSettings({}) // this test will update settings that we want successfully reverted afterwards
        .then(() => utils.getDoc('settings'))
        .then(result => settings = result.settings)
        .then(() => Promise.all([
          utils.requestOnTestDb(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, onlineRequestOptions)
          ),
          utils.requestOnTestDb(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, offlineRequestOptions)
          ),
          utils.requestOnMedicDb(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, onlineRequestOptions)
          ),
          utils.requestOnMedicDb(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, offlineRequestOptions)
          ),
        ]))
        .then(results => {
          results.forEach(result => expect(result.settings).toEqual(settings));

          const updateMedicParams = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { medic_api_v0: 'my value 1' },
          };

          return utils.requestOnMedicDb(_.defaults(updateMedicParams, onlineRequestOptions));
        })
        .then(response => {
          expect(response.success).toBe(true);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { test_api_v0: 'my value 2' },
          };
          return utils.requestOnTestDb(_.defaults(params, onlineRequestOptions));
        })
        .then(response => {
          expect(response.success).toBe(true);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { test_api_v0_offline: 'offline value 2' },
          };
          return utils.requestOnTestDb(_.defaults(params, offlineRequestOptions)).catch(err => err);
        })
        .then(response => {
          expect(response.statusCode).toEqual(403);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { medic_api_v0_offline: 'offline value 1' },
          };
          return utils.requestOnMedicDb(_.defaults(params, offlineRequestOptions)).catch(err => err);
        })
        .then(response => {
          expect(response.statusCode).toEqual(403);
        })
        .then(() => utils.getDoc('settings'))
        .then(settings => {
          expect(settings.settings.test_api_v0).toEqual('my value 2');
          expect(settings.settings.medic_api_v0).toEqual('my value 1');
          expect(settings.settings.test_api_v0_offline).not.toBeDefined();
          expect(settings.settings.medic_api_v0_offline).not.toBeDefined();
        });
    });
  });
});
