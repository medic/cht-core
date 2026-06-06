const utils = require('./utils');
const { PREFIXES } = require('@medic/constants');

describe('remove-user-language migration', function() {

  it('cleans up users with language field', function() {
    const initialUsers = [
      {
        _id: PREFIXES.COUCH_USER + 'withlang',
        name: 'withlang',
        type: 'user-settings',
        known: true,
        language: 'en',
        roles: [],
        fullname: 'With Lang',
        phone: '123456789'
      },
      {
        _id: PREFIXES.COUCH_USER + 'nolang',
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
        _id: PREFIXES.COUCH_USER + 'withlang',
        name: 'withlang',
        type: 'user-settings',
        known: true,
        roles: [],
        fullname: 'With Lang',
        phone: '123456789'
      },
      {
        _id: PREFIXES.COUCH_USER + 'nolang',
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
