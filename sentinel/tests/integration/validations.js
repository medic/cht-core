var config = require('../../src/config'),
    sinon = require('sinon'),
    assert = require('chai').assert,    
    utils = require('../../src/lib/utils'),
    transition = require('../../src/transitions/accept_patient_reports');

describe('functional validations', () => {
  /*
   * Eventually transitions/registration.js and accept_patient_reports.js will
   * be merged one transition, probably called form events.
   */
  afterEach(() => sinon.restore());

  it('patient id failing validation adds error', () => {
      var doc = {
          patient_id: 'xxxx',
          form: 'x'
      };

      sinon.stub(config, 'get').withArgs('patient_reports').returns([{
          validations: {
              list: [{
                  property: 'patient_id',
                  rule: 'regex("\\w{5}")',
                  message: [{
                      content: 'bad id {{patient_id}}',
                      locale: 'en'
                  }]
              }]
          },
          form: 'x'
      }]);

      return transition.onMatch({ doc: doc }).then(complete => {
          assert.equal(complete, true);
          assert(doc.errors);
          assert.equal(doc.errors[0].message, 'bad id xxxx');
      });
  });

  it('validations use translation_key', () => {
      sinon.stub(utils, 'translate')
          .withArgs('error.patient.id', 'en').returns('bad id {{patient_id}}');

      var doc = {
          patient_id: 'xxxx',
          form: 'x'
      };

      sinon.stub(config, 'get').withArgs('patient_reports').returns([{
          validations: {
              list: [{
                  property: 'patient_id',
                  rule: 'regex("\\w{5}")',
                  translation_key: 'error.patient.id'
              }]
          },
          form: 'x'
      }]);

      return transition.onMatch({ doc: doc }).then(complete => {
          assert.equal(complete, true);
          assert(doc.errors);
          assert.equal(doc.errors[0].message, 'bad id xxxx');
      });
  });

  it('join responses concats validation response msgs', () => {
      var doc = {
          from: '+123',
          patient_id: '123',
          fields: { patient_name: 'sam' },
          form: 'x'
      };

      sinon.stub(config, 'get').withArgs('patient_reports').returns([{
          validations: {
              join_responses: true,
              list: [
                  {
                      property: 'patient_id',
                      rule: 'regex("\\w{5}")',
                      message: [{
                          content: 'patient id should be 5 characters',
                          locale: 'en'
                      }]
                  },
                  {
                      property: 'patient_name',
                      rule: 'lenMin(5) && lenMax(50)',
                      message: [{
                          content: 'patient name should be between 5 and 50 chars.',
                          locale: 'en'
                      }]
                  },
              ]
          },
          form: 'x'
      }]);

      return transition.onMatch({ doc: doc }).then(complete => {
          assert.equal(complete, true);
          assert(doc.errors);
          // check errors array
          assert.equal(
              doc.errors[0].message,
              'patient id should be 5 characters'
          );
          assert.equal(
              doc.errors[1].message,
              'patient name should be between 5 and 50 chars.'
          );
          // response should include all validation response messages
          assert.equal(
              doc.tasks[0].messages[0].message,
              'patient id should be 5 characters  ' +
              'patient name should be between 5 and 50 chars.'
          );
      });
  });

  it('false join_responses does not concat validation msgs', () => {
      var doc = {
          from: '+123',
          patient_id: '123',
          fields: { patient_name: 'sam' },
          form: 'x'
      };

      sinon.stub(config, 'get').withArgs('patient_reports').returns([{
          validations: {
              join_responses: false,
              list: [
                  {
                      property: 'patient_id',
                      rule: 'regex("\\w{5}")',
                      message: [{
                          content: 'patient id should be 5 characters',
                          locale: 'en'
                      }]
                  },
                  {
                      property: 'patient_name',
                      rule: 'lenMin(5) && lenMax(50)',
                      message: [{
                          content: 'patient name should be between 5 and 50 chars.',
                          locale: 'en'
                      }]
                  },
              ]
          },
          form: 'x'
      }]);

      return transition.onMatch({ doc: doc }).then(complete => {
          assert.equal(complete, true);
          assert(doc.errors);
          // check errors array
          assert.equal(
              doc.errors[0].message,
              'patient id should be 5 characters'
          );
          assert.equal(
              doc.errors[1].message,
              'patient name should be between 5 and 50 chars.'
          );
          // check response
          assert.equal(
              doc.tasks[0].messages[0].message,
              'patient id should be 5 characters'
          );
      });
  });

  it('undefined join_responses does not concat validation msgs', () => {
      var doc = {
          from: '+123',
          patient_id: '123',
          fields: { patient_name: 'sam' },
          form: 'x'
      };

      sinon.stub(config, 'get').withArgs('patient_reports').returns([{
          validations: {
              list: [
                  {
                      property: 'patient_id',
                      rule: 'regex("\\w{5}")',
                      message: [{
                          content: 'patient id should be 5 characters',
                          locale: 'en'
                      }]
                  },
                  {
                      property: 'patient_name',
                      rule: 'lenMin(5) && lenMax(50)',
                      message: [{
                          content: 'patient name should be between 5 and 50 chars.',
                          locale: 'en'
                      }]
                  },
              ]
          },
          form: 'x'
      }]);

      return transition.onMatch({ doc: doc }).then(complete => {
          assert.equal(complete, true);
          assert(doc.errors);
          // check errors array
          assert.equal(
              doc.errors[0].message,
              'patient id should be 5 characters'
          );
          assert.equal(
              doc.errors[1].message,
              'patient name should be between 5 and 50 chars.'
          );
          // check response
          assert.equal(
              doc.tasks[0].messages[0].message,
              'patient id should be 5 characters'
          );
      });
  });
});
