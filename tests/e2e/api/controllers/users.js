const constants = require('../../../constants');
const http = require('http');
const utils = require('../../../utils');
const uuid = require('uuid');

const user = n => `org.couchdb.user:${n}`;

describe('Users API', () => {
  describe('POST /api/v1/users/{username}', () => {
    const username = 'test' + new Date().getTime();
    const password = 'pass1234!';
    const _usersUser = {
      _id: user(username),
      type: 'user',
      name: username,
      password: password,
      facility_id: null,
      roles: [
        'kujua_user',
        'data_entry',
      ]
    };

    const newPlaceId = 'NewPlaceId' + new Date().getTime();

    let cookie;

    const medicData = [
      {
        _id: user(username),
        facility_id: null,
        contact_id: null,
        name: username,
        fullname: 'Test Apiuser',
        type: 'user-settings',
        roles: [
          'kujua_user',
          'data_entry',
        ]
      },
      {
        _id: newPlaceId,
        type: 'clinic'
      }

    ];

    beforeAll(() =>
      utils.request({
        path: '/_users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: _usersUser
      })
      .then(() => utils.saveDocs(medicData))
      .then(() => {
        const deferred = protractor.promise.defer();

        const options = {
          hostname: constants.API_HOST,
          port: constants.API_PORT,
          path: '/_session',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          auth: `${username}:${password}`
        };

        // Use http service to extract cookie
        const req = http.request(options, res => {
          if (res.statusCode !== 200) {
            return deferred.reject('Expected 200 from _session authing');
          }

          // Example header:
          // AuthSession=cm9vdDo1MEJDMDEzRTp7Vu5GKCkTxTVxwXbpXsBARQWnhQ; Version=1; Path=/; HttpOnly
          try {
            cookie = res.headers['set-cookie'][0].match(/^(AuthSession=[^;]+)/)[0];
          } catch (err) {
            return deferred.reject(err);
          }

          deferred.fulfill(cookie);
        });

        req.write(JSON.stringify({
            name: username,
            password: password
        }));
        req.end();

        return deferred.promise;
      }));

    afterAll(() =>
      utils.request(`/_users/${user(username)}`)
        .then(({_rev}) => utils.request({
          path: `/_users/${user(username)}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            _id: user(username),
            _rev: _rev,
            _deleted: true
          }
        }))
        .then(() => utils.revertDb()));

    it('Allows for admin users to modify someone', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          place: newPlaceId
        }
      })
      .then(() => utils.getDoc(user(username)))
      .then(doc => {
        expect(doc.facility_id).toBe(newPlaceId);
      }));

    it('401s if a user without the right permissions attempts to modify someone else', () =>
      utils.request({
        path: '/api/v1/users/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          place: newPlaceId
        },
        auth: `${username}:${password}`
      })
      .then(() => fail('You should get a 401 in this situation'))
      .catch(err => {
        expect(err.responseBody).toBe('You do not have permissions to modify this person');
      }));

    it('Errors if a user edits themselves but attempts to change their roles', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          type: 'national-manager'
        },
        auth: `${username}:${password}`
      })
      .then(() => fail('You should get an error in this situation'))
      .catch(err => {
        expect(err.responseBody).toBe('not logged in');
      }));

    it('Allows for users to modify themselves with a cookie', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: {
          fullname: 'Awesome Guy'
        },
        auth: `${username}:${password}`
      })
      .then(() => utils.getDoc(user(username)))
      .then(doc => {
        expect(doc.fullname).toBe('Awesome Guy');
      }));

    it('Does not allow users to update their password with only a cookie', () =>
        utils.request({
          path: `/api/v1/users/${username}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
          },
          body: {
            password: 'swizzlesticks'
          },
        }, {noAuth: true})
        .then(() => fail('You should get an error in this situation'))
        .catch(err => {
          expect(err.responseBody).toBe('You must authenticate with Basic Auth to modify your password');
        }));

    it('Does allow users to update their password with a cookie and also basic auth', () =>
        utils.request({
          path: `/api/v1/users/${username}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
          },
          body: {
            password: password // keeping it the same, but the security check will be equivilent,
                               // our code can't know it's the same!
          },
          auth: `${username}:${password}`
        })
        .catch(() => fail('This should not result in an error')));

    it('Does allow users to update their password with just basic auth', () =>
        utils.request({
          path: `/api/v1/users/${username}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            password: password // keeping it the same, but the security check will be equivilent,
                               // our code can't know it's the same!
          },
          auth: `${username}:${password}`
        })
        .catch(() => fail('This should not result in an error')));

  });

  describe('/api/v1/users-info', () => {

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

    let offlineRequestOptions;
    let onlineRequestOptions;
    const nbrOfflineDocs = 30;
    let expectedNbrDocs = nbrOfflineDocs + 4; // _design/medic-client + org.couchdb.user:offline + fixture:offline + OfflineUser

    beforeAll(done => {
      utils
        .saveDoc(parentPlace)
        .then(() => Promise.all(users.map(user => utils.request({
          path: '/api/v1/users',
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: user
        }))))
        .then(() => {
          const docs = Array.from(Array(nbrOfflineDocs), () => ({
            _id: `random_contact_${uuid()}`,
            type: `clinic`,
            parent: { _id: 'fixture:offline' }
          }));
          return utils.saveDocs(docs);
        })
        .then(() => utils.requestOnTestDb('/_design/medic/_view/docs_by_replication_key?key="_all"'))
        .then(resp => expectedNbrDocs += resp.rows.length)
        .then(done);
    });

    afterAll(done =>
      utils
        .revertDb()
        .then(() => utils.deleteUsers(users.map(user => user.username)))
        .then(done)
    );

    beforeEach(() => {
      offlineRequestOptions = {
        path: '/api/v1/users-info',
        auth: `offline:${password}`,
        method: 'GET'
      };

      onlineRequestOptions = {
        path: '/api/v1/users-info',
        auth: `online:${password}`,
        method: 'GET'
      };
    });

    it('should return correct number of allowed docs for offline users', () => {
      return utils.request(offlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false });
      });
    });

    it('should return correct number of allowed docs when requested by online user with GET', () => {
      onlineRequestOptions.path += '?role=district_admin&facility_id=fixture:offline';
      return utils.request(onlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false });
      });
    });

    it('should return correct number of allowed docs when requested by online user with POST', () => {
      onlineRequestOptions.method = 'POST';
      onlineRequestOptions.body = {
        role: 'district_admin',
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.headers = { 'Content-Type': 'application/json' };
      return utils.request(onlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false });
      });
    });

    it('should ignore parameters for requests from offline users', () => {
      offlineRequestOptions.path += '?role=district_admin&facility_id=fixture:online';
      return utils.request(offlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false });
      });
    });
  });
}) ;
