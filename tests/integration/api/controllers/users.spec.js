const constants = require('@constants');
const https = require('https');
const utils = require('@utils');
const uuid = require('uuid').v4;
const querystring = require('querystring');
const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const sentinelUtils = require('@utils/sentinel');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

const getUserId = n => `org.couchdb.user:${n}`;
const password = 'passwordSUP3RS3CR37!';
const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital'
};

const randomIp = () => {
  const section = () => (Math.floor(Math.random() * 255) + 1);
  return `${section()}.${section()}.${section()}.${section()}`;
};

describe('Users API', () => {

  const expectPasswordLoginToWork = (user) => {
    const opts = {
      path: '/login',
      method: 'POST',
      simple: false,
      noAuth: true,
      body: { user: user.username, password: user.password },
      followRedirect: false,
      headers: { 'X-Forwarded-For': randomIp() },
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
      headers: { 'X-Forwarded-For': randomIp() },
    };

    return utils
      .requestOnMedicDb(opts)
      .then(response => {
        chai.expect(response).to.deep.include({ statusCode: 401, body: { error: 'Not logged in' } });
      });
  };

  describe('POST /api/v1/users/{username}', () => {
    const username = 'test' + new Date().getTime();
    const password = 'pass1234!';
    const _usersUser = {
      _id: getUserId(username),
      type: 'user',
      name: username,
      password: password,
      facility_id: null,
      contact_id: null,
      roles: [
        'chw',
        'data_entry',
      ]
    };

    const newPlaceId = 'NewPlaceId' + new Date().getTime();
    const newContactId = 'NewContactId' + new Date().getTime();

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
          'chw',
          'data_entry',
        ]
      },
      {
        _id: newPlaceId,
        type: 'clinic'
      },
      {
        _id: newContactId,
        type: 'person',
        parent: {
          _id: newPlaceId,
        },
      },
    ];

    before(async () => {
      await utils.updatePermissions(['chw'], ['can_edit']);

      await utils.request({
        path: '/_users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: _usersUser
      });

      await utils.saveDocs(medicData);

      return new Promise((resolve, reject) => {
        const options = {
          hostname: constants.API_HOST,
          path: '/_session',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          auth: `${username}:${password}`
        };

        // Use http service to extract cookie
        const req = https.request(options, res => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Expected 200 from _session authing, but got ${res.statusCode}`));
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
      });
    });

    after(async () => {
      const { _rev } = await utils.request(`/_users/${getUserId(username)}`);
      await utils.request({
        path: `/_users/${getUserId(username)}`,
        method: 'PUT',
        body: {
          _id: getUserId(username),
          _rev,
          _deleted: true,
        }
      });
      await utils.revertSettings(true);
      await utils.revertDb([], true);
    });

    it('Allows for admin users to modify someone', async () => {
      let userSettingsDoc = await utils.getDoc(getUserId(username));
      chai.expect(userSettingsDoc.facility_id).to.equal(null);
      chai.expect(userSettingsDoc.contact_id).to.equal(null);
      let userDoc = await utils.usersDb.get(getUserId(username));
      chai.expect(userDoc.facility_id).to.equal(null);
      chai.expect(userDoc.contact_id).to.equal(null);

      await utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        body: {
          place: newPlaceId,
          contact: newContactId,
        },
      });
      userSettingsDoc = await utils.getDoc(getUserId(username));
      chai.expect(userSettingsDoc.facility_id).to.deep.equal([newPlaceId]);
      chai.expect(userSettingsDoc.contact_id).to.equal(newContactId);
      userDoc = await utils.usersDb.get(getUserId(username));
      chai.expect(userDoc.facility_id).to.deep.equal([newPlaceId]);
      chai.expect(userDoc.contact_id).to.equal(newContactId);
    });

    it('401s if a user without the right permissions attempts to modify someone else', () => {
      return utils
        .request({
          path: '/api/v1/users/admin',
          method: 'POST',
          body: {
            place: newPlaceId
          },
          auth: { username, password },
        })
        .then(() => fail('You should get a 401 in this situation'))
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('You do not have permissions to modify this person');
        });
    });

    it('Errors if a user edits themselves but attempts to change their roles', () => {
      return utils
        .request({
          path: `/api/v1/users/${username}`,
          method: 'POST',
          body: {
            type: 'national-manager'
          },
          auth: { username, password },
        })
        .then(() => fail('You should get an error in this situation'))
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('unauthorized');
        });
    });

    it('Allows for users to modify themselves with a cookie', () => {
      return utils
        .request({
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
          chai.expect(doc.fullname).to.equal('Awesome Guy');
        });
    });

    it('Does not allow users to update their password with only a cookie', () => {
      return utils
        .request({
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
          chai.expect(err.responseBody.error).to.equal('You must authenticate with Basic Auth to modify your password');
        });
    });

    it('allows users to update their password with a cookie and also basic auth', async () => {
      const response = await utils.request({
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
      });
      expect(response).to.deep.nested.include({ 'user.id': getUserId(username) });
    });

    it('allows users to update their password with just basic auth', async () => {
      const response = await utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        body: {
          password: password // keeping it the same, but the security check will be equivilent,
          // our code can't know it's the same!
        },
        auth: { username, password }
      });
      expect(response).to.deep.nested.include({ 'user.id': getUserId(username) });
    });

    it('should work with enabled transitions', () => {
      const parentPlace = {
        _id: 'PARENT_PLACE',
        name: 'Parent place',
        type: 'district_hospital',
        reported_date: new Date().getTime()
      };
      return utils
        .revertSettings(true)
        .then(() => utils.updateSettings({ transitions: { generate_patient_id_on_people: true }}, true))
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
          chai.expect(userSettings.facility_id).to.deep.equal(user.facility_id);

          return utils.getDocs([userSettings.contact_id, ...userSettings.facility_id]);
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
      },
      {
        username: 'offlineonline',
        password: password,
        place: {
          _id: 'fixture:offlineonline',
          type: 'health_center',
          name: 'Online place',
          parent: 'PARENT_PLACE'
        },
        contact: {
          _id: 'fixture:user:offlineonline',
          name: 'OnlineUser'
        },
        roles: ['data_entry']
      },
    ];

    let offlineRequestOptions;
    let onlineRequestOptions;
    const nbrOfflineDocs = 30;
    const nbrTasks = 20;
    // _design/medic-client + org.couchdb.user:offline + fixture:offline + OfflineUser
    let expectedNbrDocs = nbrOfflineDocs + 4;
    let docsForAll;

    before(async () => {
      await utils.saveDoc(parentPlace);
      await utils.createUsers(users);
      const docs = Array.from(Array(nbrOfflineDocs), () => ({
        _id: `random_contact_${uuid()}`,
        type: `clinic`,
        parent: { _id: 'fixture:offline' }
      }));
      docs.push(...Array.from(Array(nbrTasks), () => ({
        _id: `task~org.couchdb.user:offline~${uuid()}`,
        type: 'task',
        user: 'org.couchdb.user:offline'
      })));
      await utils.saveDocs(docs);
      const resp = await utils.requestOnTestDb('/_design/medic/_view/docs_by_replication_key?key="_all"');
      docsForAll = resp.rows.length + 2; // _design/medic-client + org.couchdb.user:doc
      expectedNbrDocs += resp.rows.length;
    });

    after(async () => {
      await utils.revertDb([], true);
      await utils.deleteUsers(users);
    });

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
        chai.expect(resp).to.deep.equal({
          total_docs: expectedNbrDocs + nbrTasks,
          warn_docs: expectedNbrDocs,
          warn: false,
          limit: 10000
        });
      });
    });

    it('should return correct number of allowed docs when requested by online user', () => {
      onlineRequestOptions.path += '?role=district_admin&facility_id=fixture:offline';
      return utils.request(onlineRequestOptions).then(resp => {
        chai.expect(resp).to.deep.equal({
          total_docs: expectedNbrDocs,
          warn_docs: expectedNbrDocs,
          warn: false,
          limit: 10000
        });
      });
    });

    it('auth should check for mm-online role when requesting other user docs', () => {
      const requestOptions = {
        path: '/api/v1/users-info?role=district_admin&facility_id=fixture:offline',
        auth: { username: 'offlineonline', password },
        method: 'GET'
      };

      return utils
        .request(requestOptions)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          // online users require the "can_update_users" permission to be able to access this endpoint
          chai.expect(err.error).to.deep.equal({
            code: 403,
            error: 'Insufficient privileges',
          });
        });
    });

    it('auth should check for mm-online role when requesting with missing params', () => {
      const requestOptions = {
        path: '/api/v1/users-info',
        auth: { username: 'offlineonline', password },
        method: 'GET'
      };

      return utils
        .request(requestOptions)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          // online users require the "can_update_users" permission to be able to access this endpoint
          chai.expect(err.error).to.deep.equal({
            code: 403,
            error: 'Insufficient privileges',
          });
        });
    });

    it('should return correct number of allowed docs when requested by online user for an array of roles', () => {
      const params = {
        role: JSON.stringify(['random', 'district_admin', 'random']),
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils.request(onlineRequestOptions).then(resp => {
        chai.expect(resp).to.deep.equal({
          total_docs: expectedNbrDocs,
          warn_docs: expectedNbrDocs,
          warn: false,
          limit: 10000
        });
      });
    });

    it('should ignore parameters for requests from offline users', () => {
      const params = {
        role: 'district_admin',
        facility_id: 'fixture:online'
      };
      offlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils.request(offlineRequestOptions).then(resp => {
        chai.expect(resp).to.deep.equal({
          total_docs: expectedNbrDocs + nbrTasks,
          warn_docs: expectedNbrDocs,
          warn: false,
          limit: 10000
        });
      });
    });

    it('should throw error when requesting for online roles', () => {
      const params = {
        role: JSON.stringify(['national_admin', 'mm-online']),
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      onlineRequestOptions.headers = { 'Content-Type': 'application/json' };
      return utils
        .request(onlineRequestOptions)
        .then(resp => chai.expect(resp).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
        });
    });

    it('should throw error for array roles of online user', () => {
      const params = {
        role: JSON.stringify(['random', 'national_admin', 'mm-online']),
        facility_id: 'fixture:offline'
      };
      onlineRequestOptions.path += '?' + querystring.stringify(params);
      return utils
        .request(onlineRequestOptions)
        .then(resp => chai.expect(resp).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
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
          chai.expect(resp).to.deep.equal({ total_docs: docsForAll, warn_docs: docsForAll, warn: false, limit: 10000 });
        });
    });
  });

  describe('token-login', () => {
    let user;

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

    before(() => utils.saveDoc(parentPlace));
    after(() => utils.revertDb([], true));

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
        contact_id: 'fixture:user:testuser',
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

    const expectTokenLoginToSucceed = (url) => {
      const opts = {
        uri: url,
        method: 'POST',
        simple: false,
        resolveWithFullResponse: true,
        noAuth: true,
        followRedirect: false,
        body: {},
        headers: { 'X-Forwarded-For': randomIp() },
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
        headers: { 'X-Forwarded-For': randomIp() },
      };
      return utils.request(opts).then(response => {
        chai.expect(response.headers['set-cookie']).to.be.undefined;
        chai.expect(response).to.deep.include({ statusCode: 401, body: { error: expired ? 'expired': 'invalid' } });
      });
    };

    const expectSendableSms = (doc, to) => {
      const opts = {
        path: '/api/sms',
        method: 'POST',
        body: {},
      };

      const viewifyMessage = ({ uuid, message, to }) => ({ to, id: uuid, content: message });

      return utils.request(opts).then(response => {
        const messages = to ? response.messages.filter(message => message.to === to) : response.messages;
        chai.expect(messages).to.be.an('array');
        chai.expect(messages.length).to.equal(doc.tasks.length);
        chai.expect(messages).to.have.deep.members(doc.tasks.map(task => viewifyMessage(task.messages[0])));
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

      it('should create many users where one fails to be created w/o token_login', async () => {
        const users = [
          {
            username: 'offline4',
            password: password,
            place: {
              _id: 'fixture:offline4',
              type: 'health_center',
              name: 'Offline4 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline4',
              name: 'Offline4User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'be', 'offline4']
          },
          {
            username: 'invalid/username',
            password: password,
            place: {
              _id: 'fixture:offline5',
              type: 'health_center',
              name: 'Offline5 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline5',
              name: 'Offline5User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'fail']
          },
        ];
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true } };
        await utils.updateSettings(settings, true);
        await utils.addTranslations('en', { token_login_sms: 'Instructions sms' });
        const response = await utils.request({ path: '/api/v1/users', method: 'POST', body: users });

        chai.expect(response).to.shallowDeepEqual([
          {
            user: { id: getUserId(users[0].username) },
            'user-settings': { id: getUserId(users[0].username) },
            contact: { id: users[0].contact._id },
          },
          {
            error: {
              message:
                'Invalid user name. Valid characters are lower case letters, numbers, underscore (_), and hyphen (-).',
              translationKey: 'username.invalid'
            },
          },
        ]);
      });

      it('should fail to create many users with invalid fields w/o token_login', async () => {
        const users = [
          {
            username: 'offline5',
            password: 'password',
            place: {
              _id: 'fixture:offline5',
              type: 'health_center',
              name: 'Offline5 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline5',
              name: 'Offline5User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'be', 'invalid']
          },
          {
            username: 'offline6',
            place: {
              _id: 'fixture:offline6',
              type: 'health_center',
              name: 'Offline6 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline6',
              name: 'Offline6User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'be', 'invalid']
          },
          {
            username: 'offline7',
            password,
            place: {
              _id: 'fixture:offline7',
              type: 'health_center',
              name: 'Offline7 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline7',
              name: 'Offline7User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'not', 'be', 'created']
          },
        ];
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true } };
        await utils.updateSettings(settings, true);
        await utils.addTranslations('en', { token_login_sms: 'Instructions sms' });

        const response = await utils.request({ path: '/api/v1/users', method: 'POST', body: users });
        chai.expect(response).to.shallowDeepEqual([
          {
            error: {
              message:
                  'The password is too easy to guess. Include a range of types of characters to increase the score.',
              translationKey: 'password.weak'
            },
          },
          {
            error: 'Missing required fields: password'
          },
          {
            user: { id: getUserId(users[2].username) },
            'user-settings': { id: getUserId(users[2].username) },
            contact: { id: users[2].contact._id },
          },
        ]);
      });

      it('should create and update many users correctly w/o token_login', async () => {
        const users = [
          {
            username: 'offline2',
            password: password,
            place: {
              _id: 'fixture:offline2',
              type: 'health_center',
              name: 'Offline2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline2',
              name: 'Offline2User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'be', 'offline2']
          },
          {
            username: 'online2',
            password: password,
            place: {
              _id: 'fixture:online2',
              type: 'health_center',
              name: 'Online2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:online2',
              name: 'Online2User'
            },
            roles: ['national_admin']
          },
          {
            username: 'offlineonline2',
            password: password,
            place: {
              _id: 'fixture:offlineonline2',
              type: 'health_center',
              name: 'Online2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offlineonline2',
              name: 'Online2User'
            },
            roles: ['district_admin', 'mm-online2']
          },
        ];
        const settings = { token_login: { translation_key: 'token_login_sms', enabled: true } };
        await utils.updateSettings(settings, true);
        await utils.addTranslations('en', { token_login_sms: 'Instructions sms' });
        const response = await utils.request({ path: '/api/v1/users', method: 'POST', body: users });

        chai.expect(response).to.shallowDeepEqual(users.map(user => ({
          user: { id: getUserId(user.username) },
          'user-settings': { id: getUserId(user.username) },
          contact: { id: user.contact._id },
        })));

        for (const user of users) {
          let [userInDb, userSettings] = await Promise.all([getUser(user), getUserSettings(user)]);
          const extraProps = {
            facility_id: user.place._id,
            contact_id: user.contact._id,
            name: user.username,
            roles: user.roles,
          };
          expectCorrectUser(userInDb, extraProps);
          expectCorrectUserSettings(userSettings, { ...extraProps, contact_id: user.contact._id });
          chai.expect(userInDb.token_login).to.be.undefined;
          chai.expect(userSettings.token_login).to.be.undefined;
          await expectPasswordLoginToWork(user);

          const updates = {
            roles: ['new_role'],
            phone: '+40744898989',
          };
          const updateResponse = await utils.request({
            path: `/api/v1/users/${user.username}`,
            body: updates,
            method: 'POST',
          });
          chai.expect(updateResponse).to.shallowDeepEqual({
            user: { id: getUserId(user.username) },
            'user-settings': { id: getUserId(user.username) },
          });

          [userInDb, userSettings] = await Promise.all([getUser(user), getUserSettings(user)]);
          expectCorrectUser(userInDb, { ...extraProps, roles: ['new_role'] });
          expectCorrectUserSettings(userSettings, {
            ...extraProps,
            contact_id: user.contact._id,
            roles: ['new_role'],
            phone: '+40744898989',
          });
          chai.expect(userInDb.token_login).to.be.undefined;
          chai.expect(userSettings.token_login).to.be.undefined;
          await expectPasswordLoginToWork(user);
        }
      });

      it('should create and update many users correctly with token_login', async () => {
        const users = [
          {
            username: 'offline3',
            password: password,
            phone: '+40754898989',
            token_login: true,
            place: {
              _id: 'fixture:offline3',
              type: 'health_center',
              name: 'Offline2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offline3',
              name: 'Offline2User'
            },
            roles: ['district_admin', 'this', 'user', 'will', 'be', 'offline3']
          },
          {
            username: 'online3',
            password: password,
            phone: '+40755898989',
            token_login: true,
            place: {
              _id: 'fixture:online3',
              type: 'health_center',
              name: 'Online2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:online3',
              name: 'Online2User'
            },
            roles: ['national_admin']
          },
          {
            username: 'offlineonline3',
            password: password,
            token_login: true,
            phone: '+40756898989',
            place: {
              _id: 'fixture:offlineonline3',
              type: 'health_center',
              name: 'Online2 place',
              parent: 'PARENT_PLACE'
            },
            contact: {
              _id: 'fixture:user:offlineonline3',
              name: 'Online2User'
            },
            roles: ['district_admin', 'mm-online2']
          },
        ];
        const settings = {
          app_url: utils.getOrigin(),
          token_login: {
            translation_key: 'token_login_sms',
            enabled: true,
          },
        };
        await utils.updateSettings(settings, true);
        await utils.addTranslations('en', { token_login_sms: 'Instructions sms' });
        const response = await utils.request({ path: '/api/v1/users', method: 'POST', body: users });
        response.forEach((responseUser, index) => {
          chai.expect(responseUser).to.shallowDeepEqual({
            user: { id: getUserId(users[index].username) },
            'user-settings': { id: getUserId(users[index].username) },
            contact: { id: users[index].contact._id },
          });
          chai.expect(responseUser.token_login).to.have.keys('expiration_date');
        });

        for (const user of users) {
          let [userInDb, userSettings] = await Promise.all([getUser(user), getUserSettings(user)]);
          const extraProps = {
            facility_id: user.place._id,
            contact_id: user.contact._id,
            name: user.username,
            roles: user.roles,
          };
          expectCorrectUser(userInDb, extraProps);
          expectCorrectUserSettings(userSettings, { ...extraProps, contact_id: user.contact._id });
          chai.expect(userInDb.token_login).to.be.ok;
          chai.expect(userInDb.token_login).to.have.keys(['active', 'token', 'expiration_date' ]);
          chai.expect(userInDb.token_login).to.include({ active: true });
          chai.expect(userSettings.token_login).to.be.ok;
          chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date' ]);

          const tokenUrl = `${utils.getOrigin()}/medic/login/token/${userInDb.token_login.token}`;
          const loginTokenDoc = await utils.getDoc(getLoginTokenDocId(userInDb.token_login.token));
          chai.expect(loginTokenDoc).to.include({
            type: 'token_login',
            user: getUserId(user.username),
          });
          chai.expect(loginTokenDoc.tasks).to.be.ok;
          chai.expect(loginTokenDoc.tasks.length).to.equal(2);
          chai.expect(loginTokenDoc.tasks).to.shallowDeepEqual([
            {
              messages: [{ to: user.phone, message: 'Instructions sms' }],
            },
            {
              messages: [{ to: user.phone, message: tokenUrl }],
            },
          ]);

          await expectSendableSms(loginTokenDoc, user.phone);
          await expectPasswordLoginToFail(user);
          await expectTokenLoginToSucceed(tokenUrl);

          const updates = {
            roles: ['new_role'],
            phone: '+40744898989',
          };
          const updateResponse = await utils.request({
            path: `/api/v1/users/${user.username}`,
            body: updates,
            method: 'POST',
          });
          chai.expect(updateResponse).to.shallowDeepEqual({
            user: { id: getUserId(user.username) },
            'user-settings': { id: getUserId(user.username) },
          });

          [userInDb, userSettings] = await Promise.all([getUser(user), getUserSettings(user)]);
          expectCorrectUser(userInDb, { ...extraProps, roles: ['new_role'] });
          expectCorrectUserSettings(userSettings, {
            ...extraProps,
            contact_id: user.contact._id,
            roles: ['new_role'],
            phone: '+40744898989',
          });

          chai.expect(userInDb.token_login).to.be.ok;
          chai.expect(userInDb.token_login).to.have.keys([ 'active', 'token', 'expiration_date', 'login_date' ]);
          chai.expect(userInDb.token_login.active).to.equal(false);

          chai.expect(userSettings.token_login).to.be.ok;
          chai.expect(userSettings.token_login).to.have.keys(['active', 'expiration_date', 'login_date' ]);
          chai.expect(userSettings.token_login.active).to.equal(false);
          await expectTokenLoginToFail(tokenUrl);
        }
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

  describe('GET api/v2/users/{username}', () => {
    let facility;
    let person;
    let user;
    let userProgramOfficer;

    before(async () => {
      facility = placeFactory.place().build({ type: 'district_hospital', reported_date: null });
      person = utils.deepFreeze(
        personFactory.build({ role: 'chw', parent: { _id: facility._id }, reported_date: null })
      );
      facility.contact = person._id;
      facility = utils.deepFreeze(facility);
      user = userFactory.build({ username: 'chw111', place: facility._id, contact: person._id, roles: ['chw'] });
      delete user.password;
      user = utils.deepFreeze(user);
      userProgramOfficer = utils.deepFreeze(userFactory.build({
        username: 'prog222',
        place: facility._id,
        contact: person._id,
        roles: ['program_officer']
      }));

      await utils.saveDocs([ facility, person ]);
      await utils.createUsers([{ ...user, password }, { ...userProgramOfficer, password }]);

      await utils.updatePermissions(['program_officer'], ['can_view_users']);
    });

    after(async () => {
      await utils.revertSettings(true);
      await utils.revertDb([], true);
      await utils.deleteUsers([user]);
    });

    it('retrieves a user by username', async () => {
      const users = await utils.request({
        path: `/api/v2/users/${user.username}`,
      });

      expect(users).excludingEvery(['_rev']).to.deep.include({
        ...user,
        place: [facility],
        contact: person,
      });
    });

    it('retrieves a user with can_view_users permission', async () => {
      const users = await utils.request({
        path: `/api/v2/users/${user.username}`,
        auth: { username: userProgramOfficer.username, password },
      });

      expect(users).excludingEvery(['_rev']).to.deep.include({
        ...user,
        place: [facility],
        contact: person,
      });
    });

    it('returns an error when no user is found for username', async () => {
      try {
        await utils.request({
          path: `/api/v2/users/invalidUsername`,
        });
      } catch ({ error }) {
        expect(error.code).to.equal(404);
        expect(error.error).to
          .match(/Failed to find user with name \[invalidUsername\] in the \[(users|medic)\] database./);
        return;
      }

      expect.fail('Should have thrown an error');
    });

    it('returns an error when user does not have can_view_users permission', async () => {
      try {
        await utils.request({
          path: `/api/v2/users/${userProgramOfficer.username}`,
          auth: { username: user.username, password },
        });
      } catch ({ error }) {
        expect(error.code).to.equal(403);
        expect(error.error).to.equal('Insufficient privileges');
        return;
      }

      expect.fail('Should have thrown an error');
    });

    it('retrieves self even when user does not have can_view_users permission', async () => {
      const users = await utils.request({
        path: `/api/v2/users/${user.username}`,
        auth: { username: user.username, password },
      });

      expect(users).excludingEvery(['_rev']).to.deep.include({
        ...user,
        place: [facility],
        contact: person,
      });
    });
  });


  describe('POST/GET api/v2/users', () => {
    before(async () => {
      await utils.saveDoc(parentPlace);
    });

    after(async () => {
      await utils.revertDb([], true);
    });

    it('should create and get all users', async () => {
      const users = Array.from({ length: 10 }).map(() => ({
        username: uuid(),
        password: password,
        place: {
          type: 'health_center',
          name: 'Online place',
          parent: 'PARENT_PLACE'
        },
        contact: {
          name: 'OnlineUser'
        },
        roles: ['district_admin', 'mm-online']
      }));

      await utils.request({ path: '/api/v2/users', method: 'POST', body: users });

      const savedUsers = await utils.request({ path: '/api/v2/users' });
      for (const user of users) {
        const savedUser = savedUsers.find(savedUser => savedUser.username === user.username);
        expect(savedUser).to.deep.nested.include({
          id: `org.couchdb.user:${user.username}`,
          'place[0].type': user.place.type,
          'place[0].name': user.place.name,
          'place[0].parent._id': parentPlace._id,
          'contact.name': user.contact.name,
        });
      }
    });

    it('should create and query users using filters', async () => {
      const facilityE = await utils.request({
        path: '/api/v1/places',
        method: 'POST',
        body: { type: 'health_center', name: 'Facility E', parent: 'PARENT_PLACE' },
      });
      const facilityF = await utils.request({
        path: '/api/v1/places',
        method: 'POST',
        body: { type: 'health_center', name: 'Facility F', parent: 'PARENT_PLACE' },
      });
      const contactA = await utils.request({
        path: '/api/v1/people',
        method: 'POST',
        body: { name: 'Contact A', place: facilityE.id },
      });
      const contactB = await utils.request({
        path: '/api/v1/people',
        method: 'POST',
        body: { name: 'Contact B', place: facilityE.id },
      });
      const contactC = await utils.request({
        path: '/api/v1/people',
        method: 'POST',
        body: { name: 'Contact C', place: facilityF.id },
      });

      const userFactory = ({ contact, place }) => ({
        username: uuid(),
        password: password,
        roles: ['district_admin', 'mm-online'],
        contact,
        place,
      });
      const user1 = userFactory({ contact: contactA.id, place: facilityE.id });
      const user2 = userFactory({ contact: contactA.id, place: facilityE.id });
      const user3 = userFactory({ contact: contactB.id, place: facilityE.id });
      const user4 = userFactory({ contact: contactC.id, place: facilityF.id });
      const user5 = userFactory({ contact: contactC.id, place: facilityF.id });
      const [user1Response, user2Response, user3Response, user4Response, user5Response] = await utils.request({
        path: '/api/v2/users',
        method: 'POST',
        body: [user1, user2, user3, user4, user5],
      });

      const user5Name = user5Response.user.id.replace('org.couchdb.user:', '');
      await utils.request({
        path: `/api/v1/users/${user5Name}`,
        method: 'DELETE',
      });

      let filteredUsers;
      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: {
          facility_id: facilityE.id,
          contact_id: contactA.id,
        },
      });
      expect(filteredUsers.length).to.equal(2);
      // using find instead of accessing array by index here because
      // couch sorts results by their id, not by their creation order
      expect(filteredUsers.find(user => user.id === user1Response.user.id)).to.deep.nested.include({
        id: user1Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });
      expect(filteredUsers.find(user => user.id === user2Response.user.id)).to.deep.nested.include({
        id: user2Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });

      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: { facility_id: facilityE.id },
      });
      expect(filteredUsers.length).to.equal(3);
      expect(filteredUsers.find(user => user.id === user1Response.user.id)).to.deep.nested.include({
        id: user1Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });
      expect(filteredUsers.find(user => user.id === user2Response.user.id)).to.deep.nested.include({
        id: user2Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });
      expect(filteredUsers.find(user => user.id === user3Response.user.id)).to.deep.nested.include({
        id: user3Response.user.id,
        'contact._id': contactB.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });

      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: { contact_id: contactA.id },
      });
      expect(filteredUsers.length).to.equal(2);
      expect(filteredUsers.find(user => user.id === user1Response.user.id)).to.deep.nested.include({
        id: user1Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });
      expect(filteredUsers.find(user => user.id === user2Response.user.id)).to.deep.nested.include({
        id: user2Response.user.id,
        'contact._id': contactA.id,
        'place[0]._id': facilityE.id,
        'place[0].parent._id': parentPlace._id,
      });

      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: { contact_id: contactC.id },
      });
      expect(filteredUsers.length).to.equal(1);
      expect(filteredUsers.find(user => user.id === user4Response.user.id)).to.deep.nested.include({
        id: user4Response.user.id,
        'contact._id': contactC.id,
        'place[0]._id': facilityF.id,
        'place[0].parent._id': parentPlace._id,
      });

      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: { contact_id: 'non_existent_contact' },
      });
      expect(filteredUsers.length).to.equal(0);

      filteredUsers = await utils.request({
        path: '/api/v2/users',
        qs: { facility_id: 'non_existent_facility' },
      });
      expect(filteredUsers.length).to.equal(0);

      const allUsers = await utils.request({ path: '/api/v2/users' });
      expect(allUsers.map(user => user.id)).to.not.include(user5Response.user.id);
    });
  });

  describe('POST api/v3/users', () => {
    let places;
    let contact;

    before(async () => {
      const placeAttributes = {
        parent: { _id: parentPlace._id },
        type: 'health_center',
      };
      places = [
        placeFactory.place().build({ ...placeAttributes, name: 'place1' }),
        placeFactory.place().build({ ...placeAttributes, name: 'place2' }),
        placeFactory.place().build({ ...placeAttributes, name: 'place3' }),
      ];
      contact = personFactory.build({
        parent: { _id: places[0]._id, parent: places[0].parent },
      });
      await utils.saveDocs([...places, contact]);
    });

    afterEach(async () => {
      await utils.revertSettings(true);
    });

    it('should create users with multiple facilities', async () => {
      await utils.updatePermissions(['national_admin', 'chw'], ['can_have_multiple_places'], [], true);
      const onlineUserPayload = {
        username: uuid(),
        password: password,
        place: places.map(place => place._id),
        contact: contact._id,
        roles: ['national_admin']
      };

      const onlineResult = await utils.request({ path: '/api/v3/users', method: 'POST', body: onlineUserPayload });
      const onlineUserDoc = await utils.getDoc(onlineResult.user.id);
      const onlineUserSettingsDoc = await utils.getDoc(onlineResult['user-settings'].id);

      expect(onlineUserDoc).to.deep.include({
        roles: [...onlineUserPayload.roles, 'mm-online'],
        facility_id: onlineUserPayload.place,
        contact_id: onlineUserPayload.contact,
      });

      expect(onlineUserSettingsDoc).to.deep.include({
        roles: [...onlineUserPayload.roles, 'mm-online'],
        facility_id: onlineUserPayload.place,
        contact_id: onlineUserPayload.contact,
      });

      const offlineUserPayload = {
        username: uuid(),
        password: password,
        place: places.map(place => place._id),
        contact: contact._id,
        roles: ['chw']
      };

      const offlineResult = await utils.request({ path: '/api/v3/users', method: 'POST', body: offlineUserPayload });
      const offlineUserDoc = await utils.usersDb.get(offlineResult.user.id);
      const offlineUserSettingsDoc = await utils.getDoc(offlineResult['user-settings'].id);

      expect(offlineUserDoc).to.deep.include({
        roles: offlineUserPayload.roles,
        facility_id: offlineUserPayload.place,
        contact_id: offlineUserPayload.contact,
      });

      expect(offlineUserSettingsDoc).to.deep.include({
        roles: offlineUserPayload.roles,
        facility_id: offlineUserPayload.place,
        contact_id: offlineUserPayload.contact,
      });
    });

    it('should not allow creating users with multiple places without correct permission', async () => {
      const offlineUserPayload = {
        username: uuid(),
        password: password,
        place: places.map(place => place._id),
        contact: contact._id,
        roles: ['chw']
      };

      try {
        await utils.request({ path: '/api/v3/users', method: 'POST', body: offlineUserPayload });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.statusCode).to.equal(400);
        expect(error.error.error.message).to.equal('This user cannot have multiple places');
      }
    });

    it('should edit users to add multiple facilities', async () => {
      await utils.updatePermissions(['national_admin'], ['can_have_multiple_places']);
      const onlineUserPayload = {
        username: uuid(),
        password: password,
        place: places[0]._id,
        contact: contact._id,
        roles: ['national_admin']
      };

      const result = await utils.request({ path: '/api/v3/users', method: 'POST', body: onlineUserPayload });

      const onlineUserDoc = await utils.getDoc(result.user.id);

      expect(onlineUserDoc).to.deep.include({
        roles: [...onlineUserPayload.roles, 'mm-online'],
        facility_id: [onlineUserPayload.place],
        contact_id: onlineUserPayload.contact,
      });

      const updatePayload = {
        place: places.map(place => place._id),
      };

      await utils.request({
        path: `/api/v3/users/${onlineUserPayload.username}`,
        method: 'POST',
        body: updatePayload
      });

      const userDoc = await utils.usersDb.get(result.user.id);
      expect(userDoc.facility_id).to.deep.equal(updatePayload.place);
      const userSettingsDoc =  await utils.getDoc(result.user.id);
      expect(userSettingsDoc.facility_id).to.deep.equal(updatePayload.place);
    });

    it('should fail when facilities are malformed', async () => {
      await utils.updatePermissions(['national_admin', 'chw'], ['can_have_multiple_places'], [], true);
      const onlineUserPayload = {
        username: uuid(),
        password: password,
        place: [],
        contact: contact._id,
        roles: ['national_admin']
      };

      try {
        await utils.request({ path: '/api/v3/users', method: 'POST', body: onlineUserPayload });
        expect.expect.fail('Should have thrown');
      } catch (err) {
        expect(err.responseBody.code).to.equal(400);
        expect(err.responseBody.error.message).to.equal('Invalid facilities list');
      }

      const offlineUserPayload = {
        username: uuid(),
        password: password,
        place: [''],
        contact: contact._id,
        roles: ['chw']
      };

      try {
        await utils.request({ path: '/api/v3/users', method: 'POST', body: offlineUserPayload });
        expect.expect.fail('Should have thrown');
      } catch (err) {
        expect(err.responseBody.code).to.equal(400);
        expect(err.responseBody.error.message).to.equal('Missing required fields: place');
      }
    });
  });
});
