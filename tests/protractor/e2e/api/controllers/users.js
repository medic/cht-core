const constants = require('../../../constants'),
      http = require('http'),
      utils = require('../../../utils');

const user = n => `org.couchdb.user:${n}`;

describe('Users API', () => {
  describe('POST /api/v1/username/{username}', () => {
    const username = 'testapiuser';
    const password = 'pass1234!';
    const _usersUser = {
      _id: user(username),
      type: 'user',
      name: 'testapiuser',
      password: password,
      facility_id: null,
      roles: [
        'national-manager',
        'kujua_user',
        'data_entry',
      ]
    };

    const newPlaceId = 'NewPlaceId';

    let cookie;

    const medicData = [
      {
        _id: user(username),
        facility_id: null,
        contact_id: null,
        name: 'testapiuser',
        fullname: 'Test Apiuser',
        type: 'user-settings',
        roles: [
          'national-manager',
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
            console.log('TRYING HEADERS NOW');
            console.log(JSON.stringify(res.headers));
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
          place: 'NewPlaceId'
        }
      })
      .then(() => utils.getDoc(user(username)))
      .then(doc => {
        expect(doc.facility_id).toBe('NewPlaceId');
      }));

    it('401s if a user without the right permissions attempts to modify someone else', () =>
      utils.request({
        path: '/api/v1/users/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          place: 'NewPlaceId'
        },
        auth: `${username}:${password}`
      }, true)
      .then(() => fail('You should get a 401 in this situation'))
      .catch(err => {
        expect(err).toBe('not logged in');
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
        expect(err).toBe('not logged in');
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
        })
        .then(() => fail('You should get an error in this situation'))
        .catch(err => {
          expect(err).toBe('not logged in');
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

}) ;
