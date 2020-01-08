const utils = require('./utils');

describe('remove-empty-parents migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('should not affect well-defined parents', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'district_hospital',
        name: 'myfacility',
        parent: {
          _id: 'def',
          name: 'realparent',
        },
      },
      {
        _id: 'def',
        name: 'realparent',
      },
    ])
      .then(function() {

        // when
        return utils.runMigration('remove-empty-parents');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'district_hospital',
            name: 'myfacility',
            parent: {
              _id: 'def',
              name: 'realparent',
            },
          },
          {
            _id: 'def',
            name: 'realparent',
          },
        ]);

      });
  });

  it('should delete parents which are null', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'district_hospital',
        name: 'myfacility',
        parent: null,
      },
    ])
      .then(function() {

        // when
        return utils.runMigration('remove-empty-parents');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'district_hospital',
            name: 'myfacility',
          },
        ]);

      });
  });

  it('should delete parents which have no properties', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'district_hospital',
        name: 'myfacility',
        parent: {},
      },
    ])
      .then(function() {

        // when
        return utils.runMigration('remove-empty-parents');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'district_hospital',
            name: 'myfacility',
          },
        ]);

      });
  });
});
