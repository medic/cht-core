const utils = require('./utils');

describe('clean-up-corrupted-users migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('cleans up users with $promise and $resolved fields', function() {
    // given
    return utils.initDb([
      {
        _id: 'org.couchdb.user:corrupted',
        name: 'corrupted',
        type: 'user-settings',
        known: true,
        language: 'en',
        roles: [],
        fullname: 'corrupted',
        phone: '123456789',
        $promise: {},
        $resolved: true
      },
      {
        _id: 'org.couchdb.user:perfect',
        name: 'perfect',
        type: 'user-settings',
        known: true,
        language: 'en',
        roles: [],
        fullname: 'perfect',
        phone: '123456789'
      }
    ])
      .then(function() {

        // when
        return utils.runMigration('clean-up-corrupted-users');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'org.couchdb.user:corrupted',
            name: 'corrupted',
            type: 'user-settings',
            known: true,
            language: 'en',
            roles: [],
            fullname: 'corrupted',
            phone: '123456789'
          },
          {
            _id: 'org.couchdb.user:perfect',
            name: 'perfect',
            type: 'user-settings',
            known: true,
            language: 'en',
            roles: [],
            fullname: 'perfect',
            phone: '123456789'
          }
        ]);

      });
  });

});
