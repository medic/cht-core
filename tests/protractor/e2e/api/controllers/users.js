const utils = require('../../../utils');

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
      }).then(() => utils.saveDocs(medicData)));

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

    it('Allows for users to modify themselves', () =>
      utils.request({
        path: `/api/v1/users/${username}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
  });
});
