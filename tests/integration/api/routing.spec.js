const _ = require('lodash');
const utils = require('@utils');
const constants = require('@constants');
const moment = require('moment');
const semver = require('semver');

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

const getOfflineRequestOptions = (method) => Object.assign({}, offlineRequestOptions, { method });

const onlineRequestOptions = {
  auth: { username: 'online', password },
  method: 'GET',
};

const unauthenticatedGetRequestOptions = {
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
  before(async () => {
    await utils.saveDoc(parentPlace);
    await utils.createUsers(users);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(users);
  });

  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));

  describe('unauthenticated routing', () => {
    describe('API restricts endpoints which need authentication', () => {

      const tests = [
        { path: `/${constants.DB_NAME}/_design/medic/_view/someview` },
        { path: `/${constants.DB_NAME}/explain` },
        { path: `/${constants.DB_NAME}/a/b/c` },
        { path: `/${constants.DB_NAME}/PARENT_PLACE` },
        { path: `/${constants.DB_NAME}/PARENT_PLACE`, method: 'POST' },
        { path: `/${constants.DB_NAME}/PARENT_PLACE`, method: 'PUT' },
        { path: `/${constants.DB_NAME}/PARENT_PLACE`, method: 'DELETE' },
        { path: `/${constants.DB_NAME}/PARENT_PLACE/attachment` },
        { path: `/${constants.DB_NAME}/PARENT_PLACE/att`, method: 'POST' },
        { path: `/${constants.DB_NAME}/PARENT_PLACE/att`, method: 'PUT' },
        { path: `/${constants.DB_NAME}/PARENT_PLACE/att`, method: 'DELETE' },
        { path: '/some-new-db' },
        { path: '/some-new-db', method: 'PUT' },
        { path: '/medic/_design/medic/_view/someview' },
        { path: '/medic/explain' },
        { path: '/medic/a/b/c' },
        { path: '/medic/PARENT_PLACE' },
        { path: '/medic/PARENT_PLACE', method: 'POST' },
        { path: '/medic/PARENT_PLACE/attachment' },
        { path: '/api/deploy-info' },
        { path: '/medic-user-something-meta' },
        { path: '/medic-user-something-meta', method: 'PUT' },
        { path: '/medic-user-something-meta/_local/test' },
        { path: '/medic-user-usr-meta/_local/t', method: 'PUT' },
        { path: '/medic/_all_docs' },
        { path: '/medic/_all_docs', method: 'POST' },
        { path: '/medic/_changes' },
        { path: '/medic/_changes', method: 'POST' },
        { path: '/medic/_bulk_docs', method: 'POST' },
        { path: '/medic/_bulk_get', method: 'POST' },
        { path: '/purging' },
        { path: '/purging/changes' },
        { path: '/purging/changes/checkpoint' },
        { path: '/api/v1/contacts-by-phone' },
        { path: '/api/v1/contacts-by-phone', method: 'POST' },
        { path: '/api/v1/hydrate' },
        { path: '/api/v1/hydrate', method: 'POST' },
        { path: '/api/v1/forms' },
      ];

      afterEach(done => {
        // delay for 1 second to avoid hitting API rate limit
        setTimeout(done, 1000);
      });

      tests.forEach(test => {
        const options = {
          path: test.path,
          method: test.method || 'GET',
          noAuth: true
        };
        it(`: ${options.method} ${options.path}`, () => {
          return utils
            .request(options)
            .catch(err => err)
            .then(result => {
              expect(result.statusCode).to.equal(401);
              expect(result.response.headers['logout-authorization']).to.equal('CHT-Core API');
              expect(result.responseBody.error).to.equal('unauthorized');
            });
        });
      });

    });

    it('API allows endpoints which do not need authentication', () => {
      return Promise.all([
        utils.requestOnTestDb(Object.assign({ path: '/login', json: false }, unauthenticatedGetRequestOptions)),
        utils.request(Object.assign({ path: '/login/style.css' }, unauthenticatedGetRequestOptions)),
        utils.requestOnMedicDb(Object.assign({ path: '/login', json: false }, unauthenticatedGetRequestOptions)),
        utils.request(Object.assign({ path: '/setup/poll' }, unauthenticatedGetRequestOptions)),
        utils.request(Object.assign({ path: '/api/info' }, unauthenticatedGetRequestOptions)),
      ]).then(results => {
        expect(results[0].length).to.be.above(0);
        expect(results[1].length).to.be.above(0);
        expect(results[2].length).to.be.above(0);
        expect(results[3].version).to.equal('0.1.0');
        expect(results[4].version).to.equal('0.1.0');
      });
    });

    it('should display deploy-info to authenticated users', () => {
      return Promise.all([
        utils.request(Object.assign({ path: '/api/deploy-info' }, onlineRequestOptions)),
        utils.request(Object.assign({ path: '/api/deploy-info' }, offlineRequestOptions)),
        utils.requestOnTestDb('/_design/medic-client'),
      ]).then(([ deployInfoOnline, deployInfoOffline, ddoc ]) => {
        expect(
          semver.valid(deployInfoOnline.version),
          `"${deployInfoOnline.version}" is not valid semver`,
        ).to.be.ok;
        expect(
          semver.valid(deployInfoOffline.version),
          `"${deployInfoOffline.version}" is not valid semver`,
        ).to.be.ok;

        const { BRANCH, TAG } = process.env;
        const isBranchBuild = BRANCH && !TAG;

        const deployInfo = {
          ...ddoc.deploy_info,
          ...ddoc.build_info,
          version: isBranchBuild ? ddoc.build_info.build : ddoc.build_info.version
        };
        // for historical reasons, for a branch the version in the ddoc is the branch name.
        expect(deployInfoOnline).to.deep.equal(deployInfo);
        expect(deployInfoOffline).to.deep.equal(deployInfo);
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
            expect(result.statusCode).to.equal(404);
            expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.statusCode).to.equal(404);
            expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.statusCode).to.equal(404);
            expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.docs.length).to.be.above(0);
          } else {
            // offline user request
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.limit).to.equal(1);
            expect(result.fields).to.equal('all_fields');
          } else {
            // offline user requests
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.total_rows).to.equal(1);
            expect(result.indexes.length).to.equal(1);
          } else {
            // offline user request
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.ok).to.equal(true);
          } else {
            // offline user request
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
            expect(result.statusCode).to.be.undefined;
          } else {
            // offline user requests
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
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
          expect(result.statusCode).to.equal(403);
          expect(result.responseBody.error).to.equal('forbidden');
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
        expect(results[0]).to.deep.equal({});
        expect(results[1]).to.deep.equal({ missing_revs: {} });
        expect(results[2]).to.deep.equal({});
        expect(results[3]).to.deep.equal({ missing_revs: {} });
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
          expect(_.omit(result, 'rev')).to.deep.equal({ ok: true, id: '_local/some_local_id' });
          return utils.requestOnTestDb(
            _.defaults({ method: 'GET', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          expect(_.omit(result, '_rev')).to.deep.equal({ _id: '_local/some_local_id' });
          return utils.requestOnTestDb(
            _.defaults({ method: 'DELETE', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          expect(_.omit(result, 'rev')).to.deep.equal({ ok: true, id: '_local/some_local_id' });
        });
    });

    it('allows access to the app', () => {
      return Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/', json: false }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions))
      ]).then(results => {
        expect(results[0].includes('This loads as an empty page')).to.be.true; // the dummy page that clears appcache
        expect(results[1].includes('DOCTYPE html')).to.be.true;
        expect(results[2].includes('This loads as an empty page')).to.be.true;
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
            expect(result.statusCode).to.equal(403);
            expect(result.responseBody.error).to.equal('forbidden');
          });
        });
    });

    it('blocks direct access to CouchDB, to fauxton and other user meta databases', () => {
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
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/medic-user-whatever-meta' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(Object.assign({ path: '/medic-user-whatever-meta' }, getOfflineRequestOptions('PUT')))
          .catch(err => err),
        utils
          .request(Object.assign({ path: `/${constants.DB_NAME}-vault` }, onlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach(result => {
          expect(result.statusCode).to.equal(403);
          expect(result.responseBody.error).to.equal('forbidden');
        });
      });
    });
  });

  describe('_session endpoint', () => {

    it('logs the user in', () => {

      const username = 'offline';
      const now = moment.utc();
      const userCtxCookie = {
        name: username,
        roles: [ 'chw' ]
      };

      const createSession = () => {
        return utils.request({
          resolveWithFullResponse: true,
          json: true,
          path: '/_session',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: username, password },
          auth: { username, password }
        });
      };

      const getSession = sessionCookie => {
        return utils.request({
          resolveWithFullResponse: true,
          path: '/_session',
          method: 'GET',
          headers: {
            Cookie: `locale=en; ${sessionCookie}; userCtx=${JSON.stringify(userCtxCookie)}`,
          },
          noAuth: true
        });
      };

      return createSession()
        .then(res => {
          expect(res.statusCode).to.equal(200);
          expect(res.headers['set-cookie'].length).to.equal(1);
          const sessionCookie = res.headers['set-cookie'][0].split(';')[0];
          expect(sessionCookie.split('=')[0]).to.equal('AuthSession');
          return sessionCookie;
        })
        .then(sessionCookie => getSession(sessionCookie))
        .then(res => {
          expect(res.statusCode).to.equal(200);
          expect(res.headers['set-cookie'].length).to.equal(1);
          const [ content, age, path, expires, samesite ] = res.headers['set-cookie'][0].split('; ');

          // check the cookie content is unchanged
          const [ contentKey, contentValue ] = content.split('=');
          expect(contentKey).to.equal('userCtx');
          expect(decodeURIComponent(contentValue)).to.equal(JSON.stringify(userCtxCookie));

          // check the expiry date is around a year away
          const expiryValue = expires.split('=')[1];
          const expiryDate = moment.utc(expiryValue);
          const nextYear = now.add(utils.ONE_YEAR_IN_S, 'second');
          expect(expiryDate.diff(nextYear, 'hour')).to.equal(0); // add a small margin of error

          // check the other properties
          expect(samesite).to.equal('SameSite=Lax');
          expect(age).to.equal('Max-Age=31536000');
          expect(path).to.equal('Path=/');
        });
    });
  });

  describe('legacy endpoints', () => {
    afterEach(() => utils.revertSettings(true));

    it('should still route to deprecated apiV0 settings endpoints', () => {
      let settings;
      return utils
        .updateSettings({}, true) // this test will update settings that we want successfully reverted afterwards
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
          results.forEach(result => expect(result.settings).to.deep.equal(settings));

          const updateMedicParams = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { medic_api_v0: 'my value 1' },
          };

          return utils.requestOnMedicDb(_.defaults(updateMedicParams, onlineRequestOptions));
        })
        .then(response => {
          expect(response.success).to.be.true;
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
          expect(response.success).to.be.true;
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
          expect(response.statusCode).to.equal(403);
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
          expect(response.statusCode).to.equal(403);
        })
        .then(() => utils.getDoc('settings'))
        .then(settings => {
          expect(settings.settings.test_api_v0).to.equal('my value 2');
          expect(settings.settings.medic_api_v0).to.equal('my value 1');
          expect(settings.settings.test_api_v0_offline).to.be.undefined;
          expect(settings.settings.medic_api_v0_offline).to.be.undefined;
        });
    });
  });

  describe('admin access to Fauxton', () => {
    it('should allow access with a trailing slash', async () => {
      const response = await utils.request({ path: '/_utils/', json: false });
      expect(response).to.include('Project Fauxton');
    });

    it('should allow access without a trailing slash', async () => {
      const response = await utils.request({ path: '/_utils', json: false });
      expect(response).to.include('Project Fauxton');
    });
  });
});
