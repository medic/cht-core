const constants = require('../../../constants');
const http = require('http');
const utils = require('../../../utils');
const uuid = require('uuid');
const querystring = require('querystring');
const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const sentinelUtils = require('../../sentinel/utils');

const getUserId = n => `org.couchdb.user:${n}`;

describe('Users API', () => {
  describe('POST /api/v1/users/{username}', () => {
    const username = 'test' + new Date().getTime();
    const password = 'pass1234!';
    const _usersUser = {
      _id: getUserId(username),
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
        _id: getUserId(username),
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
        .then(() => new Promise((resolve, reject) => {
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
              return reject('Expected 200 from _session authing');
            }

            // Example header:
            // AuthSession=cm9vdDo1MEJDMDEzRTp7Vu5GKCkTxTVxwXbpXsBARQWnhQ; Version=1; Path=/; HttpOnly
            try {
              cookie = res.headers['set-cookie'][0].match(/^(AuthSession=[^;]+)/)[0];
            } catch (err) {
              return reject(err);
            }

            resolve(cookie);
          });

          req.write(JSON.stringify({
            name: username,
            password: password
          }));
          req.end();
        })));

    afterAll(() =>
      utils.request(`/_users/${getUserId(username)}`)
        .then(({_rev}) => utils.request({
          path: `/_users/${getUserId(username)}`,
          method: 'PUT',
          body: {
            _id: getUserId(username),
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
        .then(() => utils.getDoc(getUserId(username)))
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
        .then(() => utils.getDoc(getUserId(username)))
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
        .updateSettings({ transitions: { generate_patient_id_on_people: true }}, true)
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

  describe('token-login', () => {
    let user;
    const password = 'passwordSUP3RS3CR37!';

    const getUser = (user) => {
      const opts = { path: `/_users/${getUserId(user.username)}` };
      return utils.request(opts);
    };
    const getUserSettings = (user) => {
      return utils.requestOnMedicDb({ path: `/${getUserId(user.username)}` });
    };

    const parentPlace = {
      _id: 'PARENT_PLACE',
      type: 'district_hospital',
      name: 'Big Parent Hostpital'
    };

    beforeAll(() => utils.saveDoc(parentPlace));
    afterAll(() => utils.revertDb());

    beforeEach(() => {
      user = {
        username: 'testuser',
        password,
        roles: ['district_admin'],
        place: {
          _id: 'fixture:test',
          type: 'health_center',
          name: 'TestVille',
          parent: 'PARENT_PLACE'
        },
        contact: {
          _id: 'fixture:user:testuser',
          name: 'Bob'
        },
      };
    });
    afterEach(() => utils.deleteUsers([user]).then(() => utils.revertDb(['PARENT_PLACE'], true)));

    const expectCorrectUser = (user, extra = {}) => {
      const defaultProps = {
        name: 'testuser',
        type: 'user',
        roles: ['district_admin'],
        facility_id: 'fixture:test',
      };
      chai.expect(user).to.shallowDeepEqual(Object.assign(defaultProps, extra));
    };
    const expectCorrectUserSettings = (userSettings, extra = {}) => {
      const defaultProps = {
        name: 'testuser',
        type: 'user-settings',
        roles: ['district_admin'],
        facility_id: 'fixture:test',
        contact_id: 'fixture:user:testuser',
      };
      chai.expect(userSettings).to.shallowDeepEqual(Object.assign(defaultProps, extra));
    };

    const expectPasswordLoginToWork = (user) => {
      const opts = {
        path: '/login',
        method: 'POST',
        simple: false,
        noAuth: true,
        body: { user: user.username, password: user.password },
        followRedirect: false,
      };

      return utils
        .requestOnMedicDb(opts)
        .then(response => {
          chai.expect(response).to.include({
            statusCode: 302,
            body: '/',
          });
          chai.expect(response.headers['set-cookie']).to.be.an('array');
          chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
          chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
        });
    };

    const expectPasswordLoginToFail = (user) => {
      const opts = {
        path: '/login',
        method: 'POST',
        simple: false,
        noAuth: true,
        body: { user: user.username, password: user.password },
      };

      return utils
        .requestOnMedicDb(opts)
        .then(response => {
          chai.expect(response).to.deep.include({ statusCode: 401, body: { error: 'Not logged in' } });
        });
    };

    const expectTokenLoginToSucceed = (url) => {
      const opts = {
        uri: url,
        method: 'POST',
        simple: false,
        resolveWithFullResponse: true,
        noAuth: true,
        followRedirect: false,
        body: {},
      };
      return utils.request(opts).then(response => {
        chai.expect(response).to.include({ statusCode: 302, body: '/' });
        chai.expect(response.headers['set-cookie']).to.be.an('array');
        chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
        chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
      });
    };

    const expectTokenLoginToFail = (url, expired = false) => {
      const opts = {
        uri: url,
        method: 'POST',
        simple: false,
        noAuth: true,
        followRedirect: false,
        resolveWithFullResponse: true,
        body: {},
      };
      return utils.request(opts).then(response => {
        chai.expect(response.headers['set-cookie']).to.be.undefined;
        chai.expect(response).to.deep.include({ statusCode: 401, body: { error: expired ? 'expired': 'invalid' } });
      });
    };

    const expectSendableSms = (doc) => {
      const opts = {
        path: '/api/sms',
        method: 'POST',
        body: {},
      };

      const viewifyMessage = ({ uuid, message, to }) => ({ to, id: uuid, content: message });

      return utils.request(opts).then(response => {
        chai.expect(response.messages).to.be.an('array');
        chai.expect(response.messages.length).to.equal(doc.tasks.length);
        chai.expect(response.messages).to.have.deep.members(doc.tasks.map(task => viewifyMessage(task.messages[0])));
      });
    };

    const getLoginTokenDocId = token => `token:login:${token}`;

    describe('when token-login configuration is missing', () => {
      it('should create and update a user correctly w/o token_login', () => {
        return utils
          .request({ path: '/api/v1/users', method: 'POST', body: user })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
              contact: { id: 'fixture:user:testuser' },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);
          })
          .then(() => expectPasswordLoginToWork(user))
          .then(() => {
            const updates = {
              roles: ['new_role'],
              phone: '12345',
            };

            const opts = { path: `/api/v1/users/${user.username}`, body: updates, method: 'POST' };
            return utils.request(opts);
          })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user, { roles: ['new_role'] });
            expectCorrectUserSettings(userSettings, { roles: ['new_role'], phone: '12345' });
          })
          .then(() => expectPasswordLoginToWork(user));
      });

      it('should create and update a user correctly with token_login', () => {
        user.token_login = true;

        return utils
          .request({ path: '/api/v1/users', method: 'POST', body: user })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
              contact: { id: 'fixture:user:testuser' },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToWork(user))
          .then(() => {
            const updates = {
              roles: ['new_role'],
              phone: '12345',
              token_login: true,
            };

            const opts = { path: `/api/v1/users/${user.username}`, body: updates, method: 'POST' };
            return utils.request(opts);
          })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user, { roles: ['new_role'] });
            expectCorrectUserSettings(userSettings, { roles: ['new_role'], phone: '12345' });
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToWork(user));
      });
    });

    describe('when token-login is configured', () => {
      it('should create and update a user correctly w/o token_login', () => {
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true } };
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { token_login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
              contact: { id: 'fixture:user:testuser' },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToWork(user))
          .then(() => {
            const updates = {
              roles: ['new_role'],
              phone: '12345',
            };

            return utils.request({ path: `/api/v1/users/${user.username}`, body: updates, method: 'POST' });
          })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user, { roles: ['new_role'] });
            expectCorrectUserSettings(userSettings, { roles: ['new_role'], phone: '12345' });
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToWork(user));
      });

      it('should throw an error when phone is missing when creating a user with token_login', () => {
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true } };
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { token_login_sms: 'Instructions sms' }))
          .then(() => {
            user.token_login = true;
            return utils.request({ path: '/api/v1/users', method: 'POST', body: user });
          })
          .then(() => chai.assert.fail('should have thrown'))
          .catch(err => {
            chai.expect(err.response).to.shallowDeepEqual({
              statusCode: 400,
              body: { code: 400, error: { message: 'Missing required fields: phone' }}
            });
          });
      });

      it('should throw an error when phone is missing when updating a user with token_login', () => {
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true }, app_url: 'https://host/' };
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { token_login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(() => {
            user.token_login = true;
            user.roles = ['whatever'];
            return utils.request({ path: '/api/v1/users', method: 'POST', body: user });
          })
          .then(() => chai.assert.fail('should have thrown'))
          .catch(err => {
            chai.expect(err.response).to.shallowDeepEqual({
              statusCode: 400,
              body: { code: 400, error: { message: 'Missing required fields: phone' }}
            });

            return Promise.all([ getUser(user), getUserSettings(user) ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToWork(user));
      });

      it('should create a user correctly with token_login', () => {
        const settings = {
          app_url: utils.getOrigin(),
          token_login: {
            translation_key: 'token_login_sms',
            enabled: true,
          }
        };
        user.token_login = true;
        user.phone = '+40755898989';

        let tokenUrl;
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { token_login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
              contact: { id: 'fixture:user:testuser' },
            });
            chai.expect(response.token_login).to.have.keys('expiration_date');
            return Promise.all([
              getUser(user),
              getUserSettings(user),
            ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);

            chai.expect(user.token_login).to.be.ok;
            chai.expect(user.token_login).to.have.keys(['active', 'token', 'expiration_date' ]);
            chai.expect(user.token_login).to.include({ active: true });

            chai.expect(userSettings.token_login).to.be.ok;
            chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date' ]);

            tokenUrl = `${utils.getOrigin()}/medic/login/token/${user.token_login.token}`;

            return utils.getDoc(getLoginTokenDocId(user.token_login.token));
          })
          .then(loginTokenDoc => {
            chai.expect(loginTokenDoc).to.include({
              type: 'token_login',
              user: 'org.couchdb.user:testuser',
            });
            chai.expect(loginTokenDoc.tasks).to.be.ok;
            chai.expect(loginTokenDoc.tasks.length).to.equal(2);
            chai.expect(loginTokenDoc.tasks).to.shallowDeepEqual([
              {
                messages: [{ to: '+40755898989', message: 'Instructions sms' }],
                state: 'pending',
              },
              {
                messages: [{ to: '+40755898989', message: tokenUrl }],
                state: 'pending',
              }
            ]);

            return expectSendableSms(loginTokenDoc);
          })
          .then(() => expectPasswordLoginToFail(user))
          .then(() => expectTokenLoginToSucceed(tokenUrl))
          .then(() => Promise.all([ getUser(user), getUserSettings(user) ]))
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);

            chai.expect(user.token_login).to.be.ok;
            chai.expect(user.token_login).to.have.keys([ 'active', 'token', 'expiration_date', 'login_date' ]);
            chai.expect(user.token_login.active).to.equal(false);

            chai.expect(userSettings.token_login).to.be.ok;
            chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date', 'login_date' ]);
            chai.expect(userSettings.token_login.active).to.equal(false);
          })
          .then(() => expectTokenLoginToFail(tokenUrl)); // fails the 2nd time!
      });

      it('should update a user correctly with token_login', () => {
        const settings = { token_login: { translation_key: 'sms_text', enabled: true }, app_url: utils.getOrigin() };
        let tokenUrl;
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { sms_text: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(() => {
            const updates = {
              phone: '+40755696969',
              token_login: true,
            };
            return utils.request({ path: `/api/v1/users/${user.username}`, method: 'POST', body: updates });
          })
          .then(response => {
            chai.expect(response).to.shallowDeepEqual({
              user: { id: getUserId(user.username) },
              'user-settings': { id: getUserId(user.username) },
            });
            chai.expect(response.token_login).to.have.keys('expiration_date');
            return Promise.all([
              getUser(user),
              getUserSettings(user),
            ]);
          })
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);

            chai.expect(user.token_login).to.be.ok;
            chai.expect(user.token_login).to.have.keys(['active', 'token', 'expiration_date']);
            chai.expect(user.token_login).to.include({ active: true });

            chai.expect(userSettings.token_login).to.be.ok;
            chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date' ]);

            tokenUrl = `${utils.getOrigin()}/medic/login/token/${user.token_login.token}`;

            return utils.getDoc(getLoginTokenDocId(user.token_login.token));
          })
          .then(loginTokenDoc => {
            chai.expect(loginTokenDoc).to.include({
              type: 'token_login',
              user: 'org.couchdb.user:testuser',
            });
            chai.expect(loginTokenDoc.tasks).to.be.ok;
            chai.expect(loginTokenDoc.tasks.length).to.equal(2);
            chai.expect(loginTokenDoc.tasks).to.shallowDeepEqual([
              {
                messages: [{ to: '+40755696969', message: 'Instructions sms' }],
                state: 'pending',
              },
              {
                messages: [{ to: '+40755696969', message: tokenUrl }],
                state: 'pending',
              }
            ]);

            return expectSendableSms(loginTokenDoc);
          })
          .then(() => expectPasswordLoginToFail(user))
          .then(() => expectTokenLoginToSucceed(tokenUrl))
          .then(() => Promise.all([ getUser(user), getUserSettings(user) ]))
          .then(([ user, userSettings ]) => {
            expectCorrectUser(user);
            expectCorrectUserSettings(userSettings);

            chai.expect(user.token_login).to.be.ok;
            chai.expect(user.token_login).to.have.keys([ 'active', 'token', 'expiration_date', 'login_date' ]);
            chai.expect(user.token_login.active).to.equal(false);

            chai.expect(userSettings.token_login).to.be.ok;
            chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date', 'login_date' ]);
            chai.expect(userSettings.token_login.active).to.equal(false);
          })
          .then(() => expectTokenLoginToFail(tokenUrl)); // fails the 2nd time!
      });

      it('should not re-generate the token on subsequent updates, when token_login not specifically requested', () => {
        const settings = { token_login: { translation_key: 'login_sms', enabled: true }, app_url: utils.getOrigin() };
        user.token_login = true;
        user.phone = '+40755232323';
        let tokenLogin;
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(() => getUser(user))
          .then(user => tokenLogin = user.token_login)
          .then(() => {
            const updates = { roles: ['whatever'] };
            return utils.request({ path: `/api/v1/users/${user.username}`, method: 'POST', body: updates });
          })
          .then(response => {
            chai.expect(response.token_login).to.be.undefined;
          })
          .then(() => expectPasswordLoginToFail(user))
          .then(() => Promise.all([ getUser(user), getUserSettings(user) ]))
          .then(([ user, userSettings ]) => {
            chai.expect(user.token_login).to.deep.equal(tokenLogin);
            chai.expect(userSettings.token_login)
              .to.deep.equal({ active: true, expiration_date: tokenLogin.expiration_date });

            return utils.getDoc(getLoginTokenDocId(user.token_login.token));
          })
          .then(loginTokenDoc => {
            return expectTokenLoginToSucceed(loginTokenDoc.tasks[1].messages[0].message);
          });
      });

      it('should clear the old SMS tasks when token is re-generated', () => {
        const settings = { token_login: { translation_key: 'login_sms', enabled: true }, app_url: utils.getOrigin() };
        user.token_login = true;
        user.phone = '+40755242424';
        let firstTokenLogin;
        let secondTokenLogin;
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(() => getUser(user))
          .then(user => firstTokenLogin = user.token_login)
          .then(() => {
            const updates = { phone: '+40755989898', token_login: true };
            return utils.request({ path: `/api/v1/users/${user.username}`, method: 'POST', body: updates });
          })
          .then(response => {
            chai.expect(response.token_login).to.have.keys('expiration_date');
            return Promise.all([
              getUser(user),
              getUserSettings(user),
            ]);
          })
          .then(([ user, userSettings ]) => {
            chai.expect(user.token_login).not.to.deep.equal(firstTokenLogin);
            chai.expect(userSettings.token_login)
              .to.deep.equal({ active: true, expiration_date: user.token_login.expiration_date });

            secondTokenLogin = user.token_login;
            return utils.getDocs([
              getLoginTokenDocId(firstTokenLogin.token),
              getLoginTokenDocId(secondTokenLogin.token),
            ]);
          })
          .then(([ firstTokenLoginDoc, secondTokenLoginDoc ]) => {
            const firstUrl = `${utils.getOrigin()}/medic/login/token/${firstTokenLogin.token}`;
            const secondUrl = `${utils.getOrigin()}/medic/login/token/${secondTokenLogin.token}`;

            chai.expect(firstTokenLoginDoc.tasks).to.shallowDeepEqual([
              { state: 'cleared', messages: [{ to: '+40755242424', message: 'Instructions sms' }] },
              { state: 'cleared', messages: [{ to: '+40755242424', message: firstUrl }] },
            ]);
            chai.expect(secondTokenLoginDoc.tasks).to.shallowDeepEqual([
              { state: 'pending', messages: [{ to: '+40755989898', message: 'Instructions sms' }] },
              { state: 'pending', messages: [{ to: '+40755989898', message: secondUrl }] },
            ]);

            return Promise.all([
              expectTokenLoginToFail(firstUrl),
              expectTokenLoginToSucceed(secondUrl),
            ]);
          });
      });

      it('should disable token_login for a user when requested', () => {
        const settings = { token_login: { translation_key: 'login_sms', enabled: true }, app_url: utils.getOrigin() };
        user.token_login = true;
        user.phone = '+40755969696';
        let firstTokenLogin;
        return utils
          .updateSettings(settings, true)
          .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }))
          .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
          .then(() => getUser(user))
          .then(user => firstTokenLogin = user.token_login)
          .then(() => {
            const updates = { token_login: false, password };
            return utils.request({ path: `/api/v1/users/${user.username}`, method: 'POST', body: updates });
          })
          .then(response => {
            chai.expect(response.token_login).to.be.undefined;
            return Promise.all([
              getUser(user),
              getUserSettings(user),
              utils.getDoc(getLoginTokenDocId(firstTokenLogin.token))
            ]);
          })
          .then(([ user, userSettings, smsDoc]) => {
            chai.expect(user.token_login).to.be.undefined;
            chai.expect(userSettings.token_login).to.be.undefined;

            const tokenUrl = `${utils.getOrigin()}/medic/login/token/${firstTokenLogin.token}`;
            chai.expect(smsDoc.tasks).to.shallowDeepEqual([
              { state: 'cleared', messages: [{ to: '+40755969696', message: 'Instructions sms' }] },
              { state: 'cleared', messages: [{ to: '+40755969696', message: tokenUrl }] },
            ]);

            return expectTokenLoginToFail(tokenUrl);
          })
          .then(() => expectPasswordLoginToWork(user));
      });
    });

    it('should non-admin users cannot edit token_login docs', () => {
      const settings = { token_login: { translation_key: 'login_sms', enabled: true }, app_url: utils.getOrigin() };
      user.token_login = true;
      user.phone = '+40755969696';

      const onlineUser = {
        username: 'onlineuser',
        password,
        roles: ['national_manager'],
        place: {
          _id: 'fixture:online',
          type: 'health_center',
          name: 'TestVille',
          parent: 'PARENT_PLACE'
        },
        contact: {
          _id: 'fixture:user:online',
          name: 'Bob'
        },
      };

      let tokenLoginDocId;

      return utils
        .updateSettings(settings, true)
        .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }))
        .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: onlineUser }))
        .then(() => utils.request({ path: '/api/v1/users', method: 'POST', body: user }))
        .then(() => getUser(user))
        .then(user => {
          tokenLoginDocId = `token:login:${user.token_login.token}`;
          return utils.getDoc(tokenLoginDocId);
        })
        .then(tokenLoginDoc => {
          chai.expect(tokenLoginDoc.user).to.equal('org.couchdb.user:testuser');

          const onlineRequestOpts = {
            auth: { user: 'onlineuser', password },
            method: 'PUT',
            path: `/${tokenLoginDoc._id}`,
            body: tokenLoginDoc,
          };
          return utils.requestOnTestDb(onlineRequestOpts).catch(err => err);
        })
        .then(err => {
          chai.expect(err.response).to.deep.include({
            statusCode: 403,
            body: {
              error: 'forbidden',
              reason: 'Insufficient privileges'
            },
          });
        });
    });
  });
});
