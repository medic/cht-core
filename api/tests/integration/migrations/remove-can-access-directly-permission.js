const utils = require('./utils');

describe('remove-can-access-directly-permission migration', function() {

  it('should throw a 404 error if ddoc not found', function() {

    // given
    utils.initDb()

      // when
      .then(() => utils.runMigration('remove-can-access-directly-permission'))

      .then(() => { throw new Error('Expected migration to throw an error'); })

      .catch(err => {
        if(err.status !== 404) {
          throw err;
        } // else expected
      });

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
