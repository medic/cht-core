const _ = require('lodash');
const utils = require('../../utils');
const constants = require('../../constants');
const moment = require('moment');
const chai = require('chai');

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
  beforeAll(() => {
    return utils
      .saveDocNative(parentPlace)
      .then(() => utils.createUsersNative(users));
  });

  afterAll(() => {
    return utils
      .revertDbNative()
      .then(() => utils.deleteUsersNative(users));
  });

  afterEach(() => utils.revertDbNative(DOCS_TO_KEEP, true));

  describe('unauthenticated routing', () => {
    it('API restricts endpoints which need authorization', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(
            Object.assign({ path: '/_design/medic/_view/someview' }, unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/explain' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/a/b/c' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/PARENT_PLACE' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/PARENT_PLACE/attachment' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '/some-new-db' }, unauthenticatedRequestOptions)) // 403
          .catch(err => err),
        utils
          .requestOnMedicDbNative(
            Object.assign({ path: '/_design/medic/_view/someview' },
              unauthenticatedRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/explain' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/a/b/c' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/PARENT_PLACE' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/PARENT_PLACE/attachment' }, unauthenticatedRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '/api/deploy-info' }, unauthenticatedRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach(result => {
          chai.expect(result.statusCode).to.equal(401);
          chai.expect(result.responseBody.error).to.equal('unauthorized');
        });
      });
    });

    it('API allows endpoints which do not need authentication', () => {
      return Promise.all([
        utils.requestOnTestDbNative(Object.assign({ path: '/login', json: false }, unauthenticatedRequestOptions)),
        utils.requestNative(Object.assign({ path: '/login/style.css' }, unauthenticatedRequestOptions)),
        utils.requestNative(Object.assign({ path: '/api/v1/forms' }, unauthenticatedRequestOptions)),
        utils.requestOnMedicDbNative(Object.assign({ path: '/login', json: false }, unauthenticatedRequestOptions)),
        utils.requestNative(Object.assign({ path: '/setup/poll' }, unauthenticatedRequestOptions)),
        utils.requestNative(Object.assign({ path: '/api/info' }, unauthenticatedRequestOptions)),
      ]).then(results => {
        chai.expect(results[0].length).to.be.ok;
        chai.expect(results[1].length).to.be.ok;
        chai.expect(results[2]).to.be.an('array');
        chai.expect(results[3].length).to.be.ok;
        chai.expect(results[4].version).to.equal('0.1.0');
        chai.expect(results[5].version).to.equal('0.1.0');
      });
    });

    it('should display deploy-info to authenticated users', () => {
      return Promise.all([
        utils.requestNative(Object.assign({ path: '/api/deploy-info' }, onlineRequestOptions)),
        utils.requestNative(Object.assign({ path: '/api/deploy-info' }, offlineRequestOptions)),
        utils.requestOnTestDbNative('/_design/medic-client')
      ]).then(([ deployInfoOnline, deployInfoOffline, ddoc ]) => {
        chai.expect(deployInfoOnline).to.deep.equal(ddoc.deploy_info);
        chai.expect(deployInfoOffline).to.deep.equal(ddoc.deploy_info);
      });
    });
  });

  describe('offline users routing', () => {
    it('restricts _design/*/_list/*', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(
            Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, onlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDbNative(
            Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnTestDbNative(
            Object.assign({ path: '///_design///medic//_list//test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestNative(Object.assign(
            { path: `//${constants.DB_NAME}//_design//medic//_list//test_list/test_view` },
            offlineRequestOptions
          ))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(
            Object.assign({ path: '/_design/medic/_list/test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDbNative(
            Object.assign({ path: '///_design///medic//_list//test_list/test_view' }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestNative(
            Object.assign({ path: `//medic//_design//medic//_list//test_list/test_view` }, offlineRequestOptions)
          )
          .catch(err => err)
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.statusCode).to.equal(404);
            chai.expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
          }
        });
      });
    });

    it('restricts _design/*/_show/*', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_design/medic/_show/test' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_design/medic/_show/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_design///medic//_show//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_show//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_design/medic/_show/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_design///medic//_show//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_design//medic//_show//test/` }, offlineRequestOptions))
          .catch(err => err),

      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.statusCode).to.equal(404);
            chai.expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
          }
        });
      });
    });

    it('restricts _design/*/_view/*', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_design/medic/_view/test' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_design/medic/_view/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_design///medic//_view//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_view//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_design/medic/_view/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_design///medic//_view//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(
            Object.assign({ path: `//${constants.DB_NAME}//_design//medic//_view//test/` }, offlineRequestOptions)
          )
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.statusCode).to.equal(404);
            chai.expect(result.responseBody.error).to.equal('not_found');
          } else {
            // offline user requests
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
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
          .requestOnTestDbNative(Object.assign({ path: '/_find' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_find' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_find//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//${constants.DB_NAME}//_find//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_find' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_find//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_find//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.docs.length).to.be.ok;
          } else {
            // offline user request
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
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
          .requestOnTestDbNative(Object.assign({ path: '/_explain' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_explain' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_explain//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//${constants.DB_NAME}//_explain//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_explain' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_explain//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_explain//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.limit).to.equal(1);
            chai.expect(result.fields).to.equal('all_fields');
          } else {
            // offline user requests
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
          }
        });
      });
    });

    it('restricts _index', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_index' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_index' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_index//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//${constants.DB_NAME}//_index//` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_index' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_index//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_index//` }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.total_rows).to.equal(1);
            chai.expect(result.indexes.length).to.equal(1);
          } else {
            // offline user request
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
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
          .requestOnTestDbNative(Object.assign({ path: '/_ensure_full_commit' }, onlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_ensure_full_commit' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_ensure_full_commit//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(
            Object.assign({ path: `//${constants.DB_NAME}//_ensure_full_commit//` }, offlineRequestOptions, request)
          )
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_ensure_full_commit' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_ensure_full_commit//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_ensure_full_commit//` }, offlineRequestOptions, request))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.ok).to.equal(true);
          } else {
            // offline user request
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
          }
        });
      });
    });

    it('restricts _security', () => {
      return Promise.all([
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_security' }, onlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '/_security' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_security//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//${constants.DB_NAME}//_security//` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_security' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_security//' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_security//` }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        results.forEach((result, idx) => {
          if (idx === 0) {
            // online user request
            chai.expect(result.statusCode).to.not.be.ok;
          } else {
            // offline user requests
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
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
          .requestOnTestDbNative(Object.assign({ path: '/_purge' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDbNative(Object.assign({ path: '///_purge//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//${constants.DB_NAME}//_purge//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '/_purge' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnMedicDbNative(Object.assign({ path: '///_purge//' }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: `//medic//_purge//` }, offlineRequestOptions, request))
          .catch(err => err)
      ]).then(results => {
        results.forEach(result => {
          chai.expect(result.statusCode).to.equal(403);
          chai.expect(result.responseBody.error).to.equal('forbidden');
        });
      });
    });

    it('allows _revs_diff, _missing_revs', () => {
      const request = {
        method: 'POST',
        body: { 'some-fake-id': [] },
      };

      return Promise.all([
        utils.requestOnTestDbNative(_.defaults({ path: '/_revs_diff' }, request, offlineRequestOptions)),
        utils.requestOnTestDbNative(_.defaults({ path: '/_missing_revs' }, request, offlineRequestOptions)),
        utils.requestOnMedicDbNative(_.defaults({ path: '/_revs_diff' }, request, offlineRequestOptions)),
        utils.requestOnMedicDbNative(_.defaults({ path: '/_missing_revs' }, request, offlineRequestOptions)),
      ]).then(results => {
        chai.expect(results[0]).to.deep.equal({});
        chai.expect(results[1]).to.deep.equal({ missing_revs: {} });
        chai.expect(results[2]).to.deep.equal({});
        chai.expect(results[3]).to.deep.equal({ missing_revs: {} });
      });
    });

    it('allows _local', () => {
      const request = {
        method: 'PUT',
        body: { _id: 'some_local_id' },
        path: '/_local/some_local_id',
      };

      return utils
        .requestOnTestDbNative(_.defaults(request, offlineRequestOptions))
        .then(result => {
          chai.expect(_.omit(result, 'rev')).to.deep.equal({ ok: true, id: '_local/some_local_id' });
          return utils.requestOnTestDbNative(
            _.defaults({ method: 'GET', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          chai.expect(_.omit(result, '_rev')).to.deep.equal({ _id: '_local/some_local_id' });
          return utils.requestOnTestDbNative(
            _.defaults({ method: 'DELETE', path: '/_local/some_local_id' }, offlineRequestOptions)
          );
        })
        .then(result => {
          chai.expect(_.omit(result, 'rev')).to.deep.equal({ ok: true, id: '_local/some_local_id' });
        });
    });

    it('allows access to the app', () => {
      return Promise.all([
        utils.requestOnTestDbNative(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions)),
        utils.requestOnTestDbNative(_.defaults({ path: '/', json: false }, offlineRequestOptions)),
        utils.requestOnMedicDbNative(_.defaults({ path: '/_design/medic/_rewrite' }, offlineRequestOptions))
      ]).then(results => {
        // the dummy page that clears appcache
        chai.expect(results[0].includes('This loads as an empty page')).to.equal(true);
        chai.expect(results[1].includes('DOCTYPE html')).to.equal(true);
        chai.expect(results[2].includes('This loads as an empty page')).to.equal(true);
      });
    });

    it('blocks access to the admin app', () => {
      return Promise
        .all([
          utils
            .requestOnTestDbNative(_.defaults({ path: '/_design/medic-admin/_rewrite' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDbNative(_.defaults({ path: '/_design/medic-admin/_rewrite/' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDbNative(_.defaults({ path: '/_design/medic-admin/css/main.css' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDbNative(_.defaults({ path: '/_design/medic-admin/_rewrite' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDbNative(_.defaults({ path: '/_design/medic-admin/_rewrite/' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestOnMedicDbNative(_.defaults({ path: '/_design/medic-admin/css/main.css' }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestNative(Object.assign({ path: `/admin` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestNative(Object.assign({ path: `/admin/` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestNative(Object.assign({ path: `//admin//` }, offlineRequestOptions))
            .catch(err => err),
          utils
            .requestNative(Object.assign({ path: `/admin/css/main.css` }, offlineRequestOptions))
            .catch(err => err)
        ])
        .then(results => {
          results.forEach(result => {
            chai.expect(result.statusCode).to.equal(403);
            chai.expect(result.responseBody.error).to.equal('forbidden');
          });
        });
    });

    it('blocks direct access to CouchDB and to fauxton', () => {
      return Promise.all([
        utils
          .requestNative(Object.assign({ path: '/some-new-db', method: 'PUT' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '/_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '/_utils/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '//_utils' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '//_utils//something/else' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestNative(Object.assign({ path: '/a/b/c' }, offlineRequestOptions))
          .catch(err => err)
      ]).then(results => {
        results.forEach(result => {
          chai.expect(result.statusCode).to.equal(403);
          chai.expect(result.responseBody.error).to.equal('forbidden');
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
        return utils.requestNative({
          resolveWithFullResponse: true,
          json: true,
          path: '/_session',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: username, password },
          username,
          password
        });
      };

      const getSession = sessionCookie => {
        return utils.requestNative({
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
          chai.expect(res.statusCode).to.equal(200);
          chai.expect(res.headers['set-cookie'].length).to.equal(1);
          const sessionCookie = res.headers['set-cookie'][0].split(';')[0];
          chai.expect(sessionCookie.split('=')[0]).to.equal('AuthSession');
          return sessionCookie;
        })
        .then(sessionCookie => getSession(sessionCookie))
        .then(res => {
          chai.expect(res.statusCode).to.equal(200);
          chai.expect(res.headers['set-cookie'].length).to.equal(1);
          const [ content, age, path, expires, samesite ] = res.headers['set-cookie'][0].split('; ');

          // check the cookie content is unchanged
          const [ contentKey, contentValue ] = content.split('=');
          chai.expect(contentKey).to.equal('userCtx');
          chai.expect(decodeURIComponent(contentValue)).to.equal(JSON.stringify(userCtxCookie));

          // check the expiry date is around a year away
          const expiryValue = expires.split('=')[1];
          const expiryDate = moment.utc(expiryValue).add(1, 'hour'); // add a small margin of error
          chai.expect(expiryDate.diff(now, 'months')).to.equal(12);

          // check the other properties
          chai.expect(samesite).to.equal('SameSite=Lax');
          chai.expect(age).to.equal('Max-Age=31536000');
          chai.expect(path).to.equal('Path=/');
        });
    });
  });

  describe('legacy endpoints', () => {
    afterEach(() => utils.revertSettingsNative());

    it('should still route to deprecated apiV0 settings endpoints', () => {
      let settings;
      return utils
        .updateSettingsNative({}) // this test will update settings that we want successfully reverted afterwards
        .then(() => utils.getDocNative('settings'))
        .then(result => settings = result.settings)
        .then(() => Promise.all([
          utils.requestOnTestDbNative(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, onlineRequestOptions)
          ),
          utils.requestOnTestDbNative(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, offlineRequestOptions)
          ),
          utils.requestOnMedicDbNative(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, onlineRequestOptions)
          ),
          utils.requestOnMedicDbNative(
            Object.assign({ path: '/_design/medic/_rewrite/app_settings/medic' }, offlineRequestOptions)
          ),
        ]))
        .then(results => {
          results.forEach(result => chai.expect(result.settings).to.deep.equal(settings));

          const updateMedicParams = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { medic_api_v0: 'my value 1' },
          };

          return utils.requestOnMedicDbNative(_.defaults(updateMedicParams, onlineRequestOptions));
        })
        .then(response => {
          chai.expect(response.success).to.equal(true);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { test_api_v0: 'my value 2' },
          };
          return utils.requestOnTestDbNative(_.defaults(params, onlineRequestOptions));
        })
        .then(response => {
          chai.expect(response.success).to.equal(true);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { test_api_v0_offline: 'offline value 2' },
          };
          return utils.requestOnTestDbNative(_.defaults(params, offlineRequestOptions)).catch(err => err);
        })
        .then(response => {
          chai.expect(response.statusCode).to.equal(403);
        })
        .then(() => {
          const params = {
            path: '/_design/medic/_rewrite/update_settings/medic',
            method: 'PUT',
            body: { medic_api_v0_offline: 'offline value 1' },
          };
          return utils.requestOnMedicDbNative(_.defaults(params, offlineRequestOptions)).catch(err => err);
        })
        .then(response => {
          chai.expect(response.statusCode).to.equal(403);
        })
        .then(() => utils.getDoc('settings'))
        .then(settings => {
          chai.expect(settings.settings.test_api_v0).to.equal('my value 2');
          chai.expect(settings.settings.medic_api_v0).to.equal('my value 1');
          chai.expect(settings.settings.test_api_v0_offline).to.be.undefined;
          chai.expect(settings.settings.medic_api_v0_offline).to.be.undefined;
        });
    });
  });
});
