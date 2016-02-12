var utils = require('../utils'),
    async = require('async');

describe('Filter doc_by_place', function() {

  'use strict';

  var documentsToReturn = [
    {
      _id: 'form:doc_by_place_test_form',
      type: 'form'
    },
    {
      _id: 'parent_is_userid',
      type: 'clinic',
      parent: {
        _id: 'testuser'
      }
    },
    {
      _id: 'parents_parent_is_userid',
      type: 'district_hospital',
      parent: {
        _id: 'who_knows',
        parent: {
          _id: 'testuser'
        }
      }
    },
    {
      _id: 'health_center_parent',
      type: 'health_center',
      parent: {
        _id: 'testuser'
      }
    },
    {
      _id: 'testuser',
      type: 'person',
    },
    {
      _id: 'test_kujua_message',
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
      _id: 'test_data_record',
      type: 'data_record',
      contact: {
        _id: 'testuser'
      }
    }
  ];

  var documentsToIgnore = [
    {
      _id: 'fakedoctype',
      type: 'fakedoctype'
    },
    {
      _id: 'not_the_testuser',
      type: 'person',
    },
    {
      _id: 'test_not_assigned_kujua_message',
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
      type: 'data_record',
      contact: 'not_the_testuser'
    }
  ];

  // Should pass filter if unassigned = true
  var documentsToIgnoreSometimes = [
    {
      _id: 'test_kujua_message_no_tasks',
      type: 'data_record',
      kujua_message: true
    },
    {
      _id: 'test_kujua_message_empty_tasks',
      type: 'data_record',
      kujua_message: true,
      tasks: []
    },
    {
      _id: 'test_kujua_message_no_contact',
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
      type: 'data_record'
    }
  ];

  // TODO: consider removing this and just pulling ids from the two arrays above
  var docByPlaceIds, docByPlaceIds_unassigned;
  beforeAll(function(done) {
    var alldocs = documentsToReturn.concat(documentsToIgnore, documentsToIgnoreSometimes);

    //var filterParam = 'medic%2Fdoc_by_place'; // js filter
    var filterParam = 'erlang_filters%2Fdoc_by_place';

    var runFilter = function(isUnassigned) {
      console.log('Starting doc_by_place filter, please be patient…');
      var unassignedParam = isUnassigned ? '&unassigned=true' : '';
      return utils.request({
        path: '/medic/_changes?style=all_docs&heartbeat=10000&filter=' + filterParam + '&id=testuser' + unassignedParam,
        method: 'GET'
      }).then(function(response) {
        console.log('…done');
        return response.results.map(function(doc) {
          return doc.id;
        });
      });
    };

    console.log('Pushing ' + alldocs.length + ' documents for testing…');
    async.each(alldocs,
      function(testDoc, asyncNext) {
        utils.saveDoc(testDoc).then(function(result) {
          if (result.error) {
            console.log('Error saving doc ' + testDoc._id, testDoc, result);
          }
          asyncNext();
        });
      },
      function(err) {
        if (err) {
          console.log('Error saving doc', err);
          done();
        } else {
          console.log('…done');
        }

        runFilter(false)
          .then(function(docs) {
            docByPlaceIds = docs;
            runFilter(true)
              .then(function(moreDocs) {
                docByPlaceIds_unassigned = moreDocs;
                done();
              });
          });
      });
  }, 5 * 60 * 1000);

  afterAll(function(done) {
    var alldocs = documentsToReturn.concat(documentsToIgnore).concat(documentsToIgnoreSometimes)
                    .map(function(doc) { return doc._id; });
    console.log('\nCleaning up ' + alldocs.length + ' documentIds…', alldocs);
    async.each(alldocs, function(id, asyncNext) {
      utils.deleteDoc(id).then(asyncNext);
    }, function() {
      console.log('…done.');
      done();
    });
  });

  it('Does not return the ddoc', function() {
    expect(docByPlaceIds).not.toContain('_design/medic');
  });

  it('Contains the resources doc', function() {
    expect(docByPlaceIds).toContain('resources');
  });

  it('Contains the user document', function() {
    expect(docByPlaceIds).toContain('org.couchdb.user:admin');
  });

  it('Should always return forms', function() {
    expect(docByPlaceIds).toContain('form:doc_by_place_test_form');
  });

  describe('Documents associated with the person id', function() {
    it('Should return clinics if a recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('parent_is_userid');
    });

    it('Should return district_hospitals if the recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('parents_parent_is_userid');
    });

    it('Should return health_centers if the recursive parent is the user', function() {
      expect(docByPlaceIds).toContain('health_center_parent');
    });

    it('Should return the actual person document', function() {
      expect(docByPlaceIds).toContain('testuser');
      expect(docByPlaceIds).not.toContain('not_the_testuser');
    });

    it('Should check the contact of the first message of the first task in kujua messages', function() {
      expect(docByPlaceIds).toContain('test_kujua_message');
      expect(docByPlaceIds).not.toContain('test_not_assigned_kujua_message');
    });

    it('Should check the contact of data records', function() {
      expect(docByPlaceIds).toContain('test_data_record');
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

