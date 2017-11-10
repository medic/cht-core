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
            parent: {
              _id: 'abc'
            },
          },
        },
        {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc'
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
            parent: {
              _id: 'abc'
            },
          },
        },
        {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc'
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

  describe('Edge cases', () => {
    it.only('https://github.com/medic/medic-webapp/issues/4031', () =>
      utils.initDb([
JSON.parse(`{
   "_id": "42fbf87e-9857-8ad1-071fc2f9e15ac6b9",
   "type": "clinic",
   "name": "The Clinic",
   "contact": {
       "name": "Clinic Contact",
       "phone": "555 1000"
   },
   "parent": {
       "_id": "42fbf87e-9857-8ad1-071fc2f9e15a5e26",
       "_rev": "15-0f2d0e53d04251e7171a51b76c881dbb",
       "type": "health_center",
       "name": "The Health Center",
       "contact": {
           "name": "HC Contact",
           "phone": "555 2000"
       },
       "parent": {
           "_id": "eec1f64b-b093-0a25-f0bd72d7f6d68010",
           "_rev": "3-c2fd98be72a3ff7ececf452c67f68f5a",
           "type": "district_hospital",
           "name": "The District Hospital",
           "contact": {
               "name": "DH Contact",
               "phone": "555 3000"
           }
       }
   },
   "sent_forms": {
       "ANCR": "2015-12-12T11:00:18.886Z",
       "F": "2015-08-06T11:08:45.000Z"
   }
}`),
JSON.parse(`{
   "_id": "42fbf87e-9857-8ad1-071fc2f9e15a5e26",
   "type": "health_center",
   "name": "The Health Center",
   "contact": {
       "name": "HC Contact",
       "phone": "555 2000"
   },
   "parent": {
       "_id": "eec1f64b-b093-0a25-f0bd72d7f6d68010",
       "type": "district_hospital",
       "name": "The District Hospital",
       "parent": {
       },
       "contact": {
           "name": "DH Contact",
           "phone": "555 3000"
       }
   }
}`),
JSON.parse(`{
   "_id": "eec1f64b-b093-0a25-f0bd72d7f6d68010",
   "type": "district_hospital",
   "name": "The District Hospital",
   "parent": {
   },
   "contact": {
       "name": "DH Contact",
       "phone": "555 3000"
   }
}`)])
      .then(() => utils.runMigration('extract-person-contacts'))
      .then(() => utils.assertDb([]))
    );
  });
});
