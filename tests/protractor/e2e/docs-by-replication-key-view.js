var utils = require('../utils'),
    async = require('async');

describe('view docs_by_replication_key', function() {

  'use strict';

  var documentsToReturn = [
    {
      _id: 'form:doc_by_place_test_form',
      reported_date: 1,
      type: 'form'
    },
    {
      _id: 'report_about_patient',
      reported_date: 1,
      form: 'V',
      type: 'data_record',
      patient_id: 'testpatient'
    },
    {
      _id: 'report_about_patient_2',
      reported_date: 1,
      form: 'V',
      type: 'data_record',
      fields: { patient_id: 'testpatient' }
    },
    {
      _id: 'report_about_place',
      reported_date: 1,
      form: 'V',
      type: 'data_record',
      place_id: 'testplace'
    },
    {
      _id: 'testuser',
      reported_date: 1,
      type: 'person',
    },
    {
      _id: 'test_kujua_message',
      reported_date: 1,
      type: 'data_record',
      kujua_message: true,
      tasks: [
        {
          messages: [
            {
              contact: {
                _id: 'testuser'
              }
            }
          ]
        }
      ]
    },
    {
      _id: 'report_with_contact',
      reported_date: 1,
      form: 'V',
      type: 'data_record',
      contact: {
        _id: 'testuser'
      }
    }
  ];

  var documentsToIgnore = [
    {
      _id: 'fakedoctype',
      reported_date: 1,
      type: 'fakedoctype'
    },
    {
      _id: 'not_the_testuser',
      reported_date: 1,
      type: 'person',
    },
    {
      _id: 'test_not_assigned_kujua_message',
      reported_date: 1,
      type: 'data_record',
      kujua_message: true,
      tasks: [
        {
          messages: [
            {
              contact: 'not_the_testuser'
            }
          ]
        }
      ]
    },
    {
      _id: 'test_data_record_wrong_user',
      reported_date: 1,
      type: 'data_record',
      contact: 'not_the_testuser'
    }
  ];

  // Should pass filter if unassigned = true
  var documentsToIgnoreSometimes = [
    {
      _id: 'test_kujua_message_no_tasks',
      reported_date: 1,
      type: 'data_record',
      kujua_message: true
    },
    {
      _id: 'test_kujua_message_empty_tasks',
      reported_date: 1,
      type: 'data_record',
      kujua_message: true,
      tasks: []
    },
    {
      _id: 'test_kujua_message_no_contact',
      reported_date: 1,
      type: 'data_record',
      kujua_message: true,
      tasks: [
        {
          messages: []
        }
      ]
    },
    {
      _id: 'test_kujua_message_incoming_no_contact',
      reported_date: 1,
      type: 'data_record'
    }
  ];

  // TODO: consider removing this and just pulling ids from the two arrays above
  var docByPlaceIds,
      docByPlaceIds_unassigned;

  beforeAll(function(done) {
    var alldocs = documentsToReturn.concat(documentsToIgnore, documentsToIgnoreSometimes);

    var getChanges = function(keys) {
      console.log('Requesting changes, please be patient…');

      return utils.requestOnTestDb({
        path: '/_design/medic/_view/docs_by_replication_key?keys=' + JSON.stringify(keys),
        method: 'GET'
      }).then(function(response) {
        console.log('…got changes', response);
        return response.rows.map(function(doc) {
          return doc.id;
        });
      })
      .catch(function(err) {
        console.log('Error requesting changes', err);
      });
    };

    console.log('Pushing ' + alldocs.length + ' documents for testing…');
    async.each(alldocs,
      function(testDoc, callback) {
        utils.saveDoc(testDoc)
          .then(function() {
            callback();
          })
          .catch(callback);
      },
      function(err) {
        if (err) {
          console.error(err);
          return done(err);
        }
        console.log('…done');

        getChanges(['_all', 'testuser', 'testplace', 'testpatient'])
          .then(function(docs) {
            docByPlaceIds = docs;

            getChanges(['_all', '_unassigned', 'testuser', 'testplace', 'testpatient'])
              .then(function(docs) {
                docByPlaceIds_unassigned = docs;
                done();
              });
          });
      });
  }, 5 * 60 * 1000);

  afterAll(function(done) {
    var alldocs = documentsToReturn.concat(documentsToIgnore).concat(documentsToIgnoreSometimes)
                    .map(function(doc) { return doc._id; });
    console.log('\nCleaning up ' + alldocs.length + ' documentIds…', alldocs);
    async.each(alldocs, function(id, callback) {
      utils.deleteDoc(id)
        .then(function() {
          callback();
        })
        .catch(callback);
    }, done);
  });

  it('Does not return the ddoc', function() {
    expect(docByPlaceIds).not.toContain('_design/medic');
  });

  it('Should always return forms', function() {
    expect(docByPlaceIds).toContain('form:doc_by_place_test_form');
  });

  describe('Documents associated with the person id', function() {
    it('Should return clinics if a recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('report_about_patient');
    });

    it('Should return district_hospitals if the recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('report_about_patient_2');
    });

    it('Should return health_centers if the recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('report_about_place');
    });

    it('Should check the contact of the first message of the first task in kujua messages', function() {
      expect(docByPlaceIds).toContain('test_kujua_message');
      expect(docByPlaceIds).not.toContain('test_not_assigned_kujua_message');
    });

    it('Should check the contact of data records', function() {
      expect(docByPlaceIds).toContain('report_with_contact');
      expect(docByPlaceIds).not.toContain('test_data_record_wrong_user');
    });
  });

  describe('Documents that only pass when unassigned == true', function() {
    it('Should pass when no tasks', function() {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_no_tasks');
      expect(docByPlaceIds).not.toContain('test_kujua_message_no_tasks');
    });

    it('Should pass when empty tasks', function() {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_empty_tasks');
      expect(docByPlaceIds).not.toContain('test_kujua_message_empty_tasks');
    });

    it('Should pass when no contact', function() {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_no_contact');
      expect(docByPlaceIds).not.toContain('test_kujua_message_no_contact');
    });

    it('Should pass when no contact (incoming)', function() {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_incoming_no_contact');
      expect(docByPlaceIds).not.toContain('test_kujua_message_incoming_no_contact');
    });
  });

  // TODO: test these branches:
  //  - OK() no query id
});

