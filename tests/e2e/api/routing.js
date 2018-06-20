const _ = require('underscore'),
      utils = require('../../utils'),
      constants = require('../../constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
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

const offlineRequestOptions = {
  auth: `offline:${password}`,
  method: 'GET'
};

const onlineRequestOptions = {
  auth: `online:${password}`,
  method: 'GET'
};

const DOCS_TO_KEEP = [
  'PARENT_PLACE',
  /^messages-/,
  /^fixture/,
  /^org.couchdb.user/,
];

describe('offline users routing', () => {
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

  it('restricts _design/*/_list/*', () => {
    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_list/test_list/test_view' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '///_design///medic//_list//test_list/test_view' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_design//medic//_list//test_list/test_view` },
              offlineRequestOptions
            ))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_list/test_list/test_view' }, onlineRequestOptions))
          .catch(err => err),
      ])
      .then(results => {
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
    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_show/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '///_design///medic//_show//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_design//medic//_show//test/` },
              offlineRequestOptions
            ))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_show/test' }, onlineRequestOptions))
          .catch(err => err),
      ])
      .then(results => {
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
    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_view/test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '///_design///medic//_view//test' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(
            _.extend(
              { path: `//${constants.DB_NAME}//_design//medic//_view//test/` },
              offlineRequestOptions
            ))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_design/medic/_view/test' }, onlineRequestOptions))
          .catch(err => err),
      ])
      .then(results => {
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
      headers: { 'Content-Type': 'application/json' }
    };

    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({path: '/_find'}, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({path: '///_find//'}, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(_.extend({ path: `//${constants.DB_NAME}//_find//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_find' }, onlineRequestOptions, request))
          .catch(err => err),
      ])
      .then(results => {
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
      headers: { 'Content-Type': 'application/json' }
    };

    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({path: '/_explain'}, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({path: '///_explain//'}, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .request(_.extend({ path: `//${constants.DB_NAME}//_explain//` }, offlineRequestOptions, request))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_explain' }, onlineRequestOptions, request))
          .catch(err => err),
      ])
      .then(results => {
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
    return Promise
      .all([
        utils
          .requestOnTestDb(_.extend({path: '/_index'}, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({path: '///_index//'}, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.extend({ path: `//${constants.DB_NAME}//_index//` }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.extend({ path: '/_index' }, onlineRequestOptions))
          .catch(err => err),
      ])
      .then(results => {
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
});
