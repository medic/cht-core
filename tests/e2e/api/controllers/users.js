const constants = require('../../../constants');
const http = require('http');
const utils = require('../../../utils');
const uuid = require('uuid');
const querystring = require('querystring');
const chai = require('chai');
const sentinelUtils = require('../../sentinel/utils');

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
        body: {
          place: newPlaceId
        },
        auth: { username, password },
      })
        .then(() => fail('You should get a 401 in this situation'))
        .catch(err => {
          expect(err.responseBody.error).toBe('You do not have permissions to modify this person');
        }));

    it('Errors if a user edits themselves but attempts to change their roles', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        body: {
          type: 'national-manager'
        },
        auth: { username, password },
      })
        .then(() => fail('You should get an error in this situation'))
        .catch(err => {
          expect(err.responseBody.error).toBe('unauthorized');
        }));

    it('Allows for users to modify themselves with a cookie', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Cookie': cookie
        },
        body: {
          fullname: 'Awesome Guy'
        },
        auth: { username, password},
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
          'Cookie': cookie
        },
        body: {
          password: 'swizzlesticks'
        },
        noAuth: true
      })
        .then(() => fail('You should get an error in this situation'))
        .catch(err => {
          expect(err.responseBody.error).toBe('You must authenticate with Basic Auth to modify your password');
        }));

    it('Does allow users to update their password with a cookie and also basic auth', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Cookie': cookie
        },
        body: {
          password: password // keeping it the same, but the security check will be equivilent,
          // our code can't know it's the same!
        },
        auth: { username, password }
      })
        .catch(() => fail('This should not result in an error')));

    it('Does allow users to update their password with just basic auth', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        body: {
          password: password // keeping it the same, but the security check will be equivilent,
          // our code can't know it's the same!
        },
        auth: { username, password }
      })
        .catch(() => fail('This should not result in an error')));

    it('should work with enabled transitions', () => {
      const parentPlace = {
        _id: 'PARENT_PLACE',
        name: 'Parent place',
        type: 'district_hospital',
        reported_date: new Date().getTime()
      };
      return utils
        .updateSettings({ transitions: { generate_patient_id_on_people: true }})
        .then(() => utils.saveDoc(parentPlace))
        .then(() => {
          const opts = {
            path: '/api/v1/users',
            method: 'POST',
            body: {
              username: 'philip',
              password: password,
              roles: ['district_admin'],
              name: 'Philip',
              contact: { name: 'Philip' },
              place: { name: 'PhilipPlace', type: 'health_center', parent: 'PARENT_PLACE' },
            },
          };

          return utils.request(opts);
        })
        .then(result => {
          chai.expect(result).to.deep.nested.include({
            'user.id': 'org.couchdb.user:philip',
            'user-settings.id': 'org.couchdb.user:philip',
          });
          chai.expect(result.contact.id).to.not.be.undefined;
        })
        .then(() => sentinelUtils.waitForSentinel())
        .then(() => Promise.all([
          utils.getDoc('org.couchdb.user:philip'),
          utils.request('/_users/org.couchdb.user:philip')
        ]))
        .then(([userSettings, user]) => {
          chai.expect(userSettings).to.include({ name: 'philip', type: 'user-settings' });
          chai.expect(user).to.deep.include({ name: 'philip', type: 'user', roles: ['district_admin'] });
          chai.expect(userSettings.facility_id).to.equal(user.facility_id);

          return utils.getDocs([userSettings.contact_id, userSettings.facility_id]);
        })
        .then(([ contact, place ]) => {
          chai.expect(contact.patient_id).to.not.be.undefined;
          chai.expect(contact).to.deep.include({
            name: 'Philip',
            parent: { _id: place._id, parent: place.parent },
            type: 'person',
          });

          chai.expect(place.place_id).to.not.be.undefined;
          chai.expect(place).to.deep.include({
            contact: { _id: contact._id, parent: contact.parent },
            name: 'PhilipPlace',
            parent: { _id: 'PARENT_PLACE' },
            type: 'health_center',
          });
        });

    });

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
        roles: ['district_admin', 'this', 'user', 'will', 'be', 'offline']
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
    // _design/medic-client + org.couchdb.user:offline + fixture:offline + OfflineUser
    let expectedNbrDocs = nbrOfflineDocs + 4;
    let docsForAll;

    beforeAll(done => {
      return utils
        .saveDoc(parentPlace)
        .then(() => utils.createUsers(users))
        .then(() => {
          const docs = Array.from(Array(nbrOfflineDocs), () => ({
            _id: `random_contact_${uuid()}`,
            type: `clinic`,
            parent: { _id: 'fixture:offline' }
          }));
          return utils.saveDocs(docs);
        })
        .then(() => utils.requestOnTestDb('/_design/medic/_view/docs_by_replication_key?key="_all"'))
        .then(resp => {
          docsForAll = resp.rows.length + 2; // _design/medic-client + org.couchdb.user:doc
          expectedNbrDocs += resp.rows.length;
        })
        .then(done);
    });

    afterAll(done =>
      utils
        .revertDb()
        .then(() => utils.deleteUsers(users))
        .then(done)
    );

    beforeEach(() => {
      offlineRequestOptions = {
        path: '/api/v1/users-info',
        auth: { username: 'offline', password },
        method: 'GET'
      };

      onlineRequestOptions = {
        path: '/api/v1/users-info',
        auth: { username: 'online', password },
        method: 'GET'
      };
    });

    it('should return correct number of allowed docs for offline users', () => {
      return utils.request(offlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false, limit: 10000 });
      });
    });

    it('should return correct number of allowed docs when requested by online user', () => {
      onlineRequestOptions.path += '?role=district_admin&facility_id=fixture:offline';
      return utils.request(onlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false, limit: 10000 });
      });
    });

    it('should return correct number of allowed docs when requested by online user for an array of roles', () => {
      const params = {
        role: JSON.stringify(['random', 'district_admin', 'random']),
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils.request(onlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false, limit: 10000 });
      });
    });

    it('should ignore parameters for requests from offline users', () => {
      const params = {
        role: 'district_admin',
        facility_id: 'fixture:online'
      };
      offlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils.request(offlineRequestOptions).then(resp => {
        expect(resp).toEqual({ total_docs: expectedNbrDocs, warn: false, limit: 10000 });
      });
    });

    it('should throw error when requesting for online roles', () => {
      const params = {
        role: 'national_admin',
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      onlineRequestOptions.headers = { 'Content-Type': 'application/json' };
      return utils
        .request(onlineRequestOptions)
        .then(resp => expect(resp).toEqual('should have thrown'))
        .catch(err => {
          expect(err.statusCode).toEqual(400);
        });
    });

    it('should throw error for array roles of online user', () => {
      const params = {
        role: JSON.stringify(['random', 'national_admin', 'random']),
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils
        .request(onlineRequestOptions)
        .then(resp => expect(resp).toEqual('should have thrown'))
        .catch(err => {
          expect(err.statusCode).toEqual(400);
        });
    });

    it('should return correct response for non-existent facility', () => {
      const params = {
        role: JSON.stringify(['district_admin']),
        facility_id: 'IdonTExist'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      onlineRequestOptions.headers = { 'Content-Type': 'application/json' };
      return utils
        .request(onlineRequestOptions)
        .then(resp => {
          expect(resp).toEqual({ total_docs: docsForAll, warn: false, limit: 10000 });
        });
    });
  });
}) ;
