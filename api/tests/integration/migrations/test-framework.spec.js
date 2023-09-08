/*
 * Here are some basic tests to check that the migration integration test
 * framework itself is working as expected.
 */

const utils = require('./utils');

describe('migrations integration test framework', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  describe('no-op', function() {
    it('should leave an empty db empty', function() {
      // given
      return utils.initDb([])

        .then(function() {

          // expect
          return utils.assertDb([]);

        });
    });

    it('should leave a full db full', function() {
      // given
      return utils.initDb([
        { name: 'a', _id: '1' },
        { name: 'b', _id: '2' },
      ])

        .then(function() {

          // expect
          return utils.assertDb([
            { name: 'a', _id: '1' },
            { name: 'b', _id: '2' },
          ]);

        });
    });
  });

  it('should be able to match docs without a fixed ID', function() {
    // given
    return utils.initDb([
      { name: 'a', _id: '1' },
      { name: 'b', _id: '2' },
    ])

      .then(function() {

        // expect
        return utils.assertDb([
          { name: 'a' },
          { name: 'b' },
        ]);

      });
  });

  it('should be able to match docs with or without a fixed ID', function() {
    // given
    return utils.initDb([
      { name: 'a', _id: '1' },
      { name: 'c', _id: '3' },
      { name: 'b', _id: '2' },
    ])

      .then(function() {

        // expect
        return utils.assertDb([
          { name: 'a', _id: '1' },
          { name: 'b' },
          { name: 'c' },
        ]);

      });
  });

  it('should handle a simple migration', function() {
    // given
    return utils.initDb([
      { _id: '1', name: 'alice' },
      { _id: '2', name: 'bob' },
      { _id: '3', name: 'caz' },
    ])

      .then(function() {

        // when
        return utils.runMigration('../../tests/integration/res/migrations/reverse-names');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          { name: 'ecila', _id: '1' },
          { name: 'bob', _id: '2' },
          { name: 'zac', _id: '3' },
        ]);

      });
  });
});
