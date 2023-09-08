const utils = require('./utils');

describe('remove-user-language migration', function() {
  afterEach(() => utils.tearDown());

  it('cleans up users with language field', function() {
    const initialUsers = [
      {
        _id: 'org.couchdb.user:withlang',
        name: 'withlang',
        type: 'user-settings',
        known: true,
        language: 'en',
        roles: [],
        fullname: 'With Lang',
        phone: '123456789'
      },
      {
        _id: 'org.couchdb.user:nolang',
        name: 'nolang',
        type: 'user-settings',
        known: true,
        roles: [],
        fullname: 'No Lang',
        phone: '123456789'
      }
    ];
    const updatedUsers = [
      {
        _id: 'org.couchdb.user:withlang',
        name: 'withlang',
        type: 'user-settings',
        known: true,
        roles: [],
        fullname: 'With Lang',
        phone: '123456789'
      },
      {
        _id: 'org.couchdb.user:nolang',
        name: 'nolang',
        type: 'user-settings',
        known: true,
        roles: [],
        fullname: 'No Lang',
        phone: '123456789'
      }
    ];
    return utils.initDb(initialUsers)
      .then(() => utils.runMigration('remove-user-language'))
      .then(() => utils.assertDb(updatedUsers));
  });
});
