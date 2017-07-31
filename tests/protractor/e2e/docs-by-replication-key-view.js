const utils = require('../utils'),
      async = require('async');

describe('view docs_by_replication_key', () => {

  'use strict';

  const documentsToReturn = [
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
    },
    {
      _id: 'report_with_unknown_patient_id',
      reported_date: 1,
      form: 'V',
      type: 'data_record',
      patient_id: 'unknown_patient',
      contact: {
        _id: 'testuser'
      },
      errors: [ { code: 'registration_not_found' } ]
    }
  ];

  const documentsToIgnore = [
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
  const documentsToIgnoreSometimes = [
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
  let docByPlaceIds,
      docByPlaceIds_unassigned;

  beforeAll(done => {
    const alldocs = documentsToReturn.concat(documentsToIgnore, documentsToIgnoreSometimes);

    const getChanges = keys => {
      console.log('Requesting changes, please be patient…');

      return utils.requestOnTestDb({
        path: '/_design/medic/_view/docs_by_replication_key?keys=' + JSON.stringify(keys),
        method: 'GET'
      }).then(response => {
        console.log('…got changes', response);
        return response.rows.map(doc => {
          return doc.id;
        });
      })
        .catch(err => {
          console.log('Error requesting changes', err);
        });
    };

    console.log(`Pushing ${alldocs.length} documents for testing…`);
    async.each(alldocs,
      (testDoc, callback) => {
        utils.saveDoc(testDoc)
          .then(() => {
            callback();
          })
          .catch(callback);
      },
      err => {
        if (err) {
          console.error(err);
          return done.fail(err);
        }
        console.log('…done');

        getChanges(['_all', 'testuser', 'testplace', 'testpatient'])
          .then(docs => {
            docByPlaceIds = docs;

            getChanges(['_all', '_unassigned', 'testuser', 'testplace', 'testpatient'])
              .then(docs => {
                docByPlaceIds_unassigned = docs;
                done();
              });
          });
      });
  }, 5 * 60 * 1000);

  afterAll(utils.afterEach);

  it('Does not return the ddoc', () => {
    expect(docByPlaceIds).not.toContain('_design/medic');
  });

  it('Should always return forms', () => {
    expect(docByPlaceIds).toContain('form:doc_by_place_test_form');
  });

  describe('Documents associated with the person id', () => {
    it('Should return clinics if a recursive parent is the user', () => {
      expect(docByPlaceIds).toContain('report_about_patient');
    });

    it('Should return district_hospitals if the recursive parent is the user', () => {
      expect(docByPlaceIds).toContain('report_about_patient_2');
    });

    it('Should return health_centers if the recursive parent is the user', () => {
      expect(docByPlaceIds).toContain('report_about_place');
    });

    it('Should check the contact of the first message of the first task in kujua messages', () => {
      expect(docByPlaceIds).toContain('test_kujua_message');
      expect(docByPlaceIds).not.toContain('test_not_assigned_kujua_message');
    });

    it('Should check the contact of data records', () => {
      expect(docByPlaceIds).toContain('report_with_contact');
      expect(docByPlaceIds).not.toContain('test_data_record_wrong_user');
    });

    it('Falls back to contact id when unknown patient', () => {
      expect(docByPlaceIds).toContain('report_with_unknown_patient_id');
    });
  });

  describe('Documents that only pass when unassigned == true', () => {
    it('Should pass when no tasks', () => {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_no_tasks');
      expect(docByPlaceIds).not.toContain('test_kujua_message_no_tasks');
    });

    it('Should pass when empty tasks', () => {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_empty_tasks');
      expect(docByPlaceIds).not.toContain('test_kujua_message_empty_tasks');
    });

    it('Should pass when no contact', () => {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_no_contact');
      expect(docByPlaceIds).not.toContain('test_kujua_message_no_contact');
    });

    it('Should pass when no contact (incoming)', () => {
      expect(docByPlaceIds_unassigned).toContain('test_kujua_message_incoming_no_contact');
      expect(docByPlaceIds).not.toContain('test_kujua_message_incoming_no_contact');
    });
  });

  // TODO: test these branches:
  //  - OK() no query id
});

