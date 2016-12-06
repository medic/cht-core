var utils = require('./utils');

var ANY_STRING = new RegExp('^.*$');
var ANY_NUMBER = new RegExp('^[0-9]+(\\.[0-9]*)?$');

describe('extract-person-contacts migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('should create a new Person from facility.contact', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'district_hospital',
        name: 'myfacility',
        contact: { name:'Alice', phone:'+123' },
      },
    ])
    .then(function() {

      // when
      return utils.runMigration('extract-person-contacts');

    })
    .then(function() {

      // expect
      return utils.assertDb([
        {
          _id: 'abc',
          type: 'district_hospital',
          name: 'myfacility',
          contact: {
            _id: ANY_STRING,
            _rev: ANY_STRING,
            type: 'person',
            name: 'Alice',
            phone: '+123',
            reported_date: ANY_NUMBER,
            parent: {
              _id: 'abc',
              _rev: ANY_STRING,
              type: 'district_hospital',
              name: 'myfacility',
            },
          },
        },
        {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc',
            _rev: ANY_STRING,
            type: 'district_hospital',
            name: 'myfacility',
          },
        },
      ]);

    });
  });

  it('should retain the rc code - #2970', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'district_hospital',
        name: 'myfacility',
        contact: {
          name: 'Alice',
          phone: '+123',
          rc_code: 'rc1'
        },
      },
    ])
    .then(function() {

      // when
      return utils.runMigration('extract-person-contacts');

    })
    .then(function() {

      // expect
      return utils.assertDb([
        {
          _id: 'abc',
          type: 'district_hospital',
          name: 'myfacility',
          place_id: 'rc1',
          contact: {
            _id: ANY_STRING,
            _rev: ANY_STRING,
            type: 'person',
            name: 'Alice',
            phone: '+123',
            reported_date: ANY_NUMBER,
            parent: {
              _id: 'abc',
              _rev: ANY_STRING,
              type: 'district_hospital',
              name: 'myfacility',
            },
          },
        },
        {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc',
            _rev: ANY_STRING,
            type: 'district_hospital',
            name: 'myfacility',
          },
        },
      ]);

    });
  });

  it('should not break if parent of contact not found', function() {
    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'health_center',
        name: 'Homa Bay Health',
        parent: {
          _id: 'def',
          type: 'district_hospital',
          name: 'Kisumu',
          contact: {
            name: 'Madam Regina',
            phone: '+1234567890'
          }
        }
      }
    ])
    .then(function() {

      // when
      return utils.runMigration('extract-person-contacts');

    })
    .then(function() {

      // expect
      return utils.assertDb([
        {
          _id: 'abc',
          type: 'health_center',
          name: 'Homa Bay Health',
        },
      ]);

    });
  });

});
