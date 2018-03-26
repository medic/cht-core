const db = require('../../../db-pouch').medic;
const utils = require('./utils');

describe('remove-can-access-directly-permission migration', function() {

  let ddocBackup;

  beforeEach(() => 
    db.get('_design/medic')
      .then(ddoc => {
        ddocBackup = ddoc;
        return db.remove(ddoc);
      }));

  afterEach(() =>
    db.get('_design/medic')
      .catch(err => {
        if(err.status !== 404) {
          throw err;
        }
        return {};
      })
      .then(ddoc => {
        ddocBackup._rev = ddoc._rev;
        return db.put(ddocBackup);
      }));

  it('should throw a 404 error if ddoc not found', function() {
    // given no setup

    // when
    return utils.runMigration('remove-can-access-directly-permission')

      .then(() => { throw new Error('Expected migration to throw an error'); })

      .catch(err => { throw new Error('Caught expected error: ' + err); });

  });

  it('should not throw an error if permission not present', function() {

    // given
    return utils.initDb([
      {
        _id: '_design/medic',
        permissions: [
          { name: 'ok_1' },
          { name: 'ok_2' },
        ],
      },
    ])

      // when
      .then(() => utils.runMigration('remove-can-access-directly-permission'))

      // then
      .then(() => utils.assertDb([
        {
          _id: '_design/medic',
          permissions: [
            { name: 'ok_1' },
            { name: 'ok_2' },
          ],
        },
      ]));

  });

  it('should remove relevant permission if found', function() {

    // given
    return utils.initDb([
      {
        _id: '_design/medic',
        permissions: [
          { name: 'ok_1' },
          { name: 'can_access_directly' },
          { name: 'ok_2' },
        ],
      },
    ])

      // when
      .then(() => utils.runMigration('remove-can-access-directly-permission'))

      // then
      .then(() => utils.assertDb([
        {
          _id: '_design/medic',
          permissions: [
            { name: 'ok_1' },
            { name: 'ok_2' },
          ],
        },
      ]));

  });

});
