var moment = require('moment'),
    validation = require('../../src/lib/validation'),
    db = require('../../src/db-nano'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    clock;

describe('validations', () => {
  afterEach(() => sinon.restore());

  it('validate handles pupil parse errors', done => {
      var doc = {
          phone: '123'
      };
      var validations = [{
          property: 'phone',
          rule: 'regex(bad no quotes)'
      }];
      validation.validate(doc, validations, function(errors) {
          assert.deepEqual(
              errors,
              ['Error on pupil validations: {"message":"Unexpected identifier","pos":2}']
          );
          done();
      });
  });

  it('validate handles pupil regex', done => {
      var validations = [{
          property: 'phone',
          rule: 'regex("^\\d+$")',
          message: [{
              content: 'Invalid phone {{phone}}.',
              locale: 'en'
          }]
      }];
      validation.validate({phone: '123'}, validations, function(errors) {
          assert.deepEqual(errors, []);
      });
      validation.validate({phone: '123a'}, validations, function(errors) {
          assert.deepEqual(errors, [{
              code:'invalid_phone',
              message:'Invalid phone {{phone}}.'
          }]);
          done();
      });
  });

  it('pass unique validation when no doc found', done => {
      var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: []
      });
      var validations = [{
          property: 'patient_id',
          rule: 'unique("patient_id")'
      }];
      var doc = {
          _id: 'same',
          patient_id: '111'
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(view.callCount, 1);
          assert.equal(view.args[0][0], 'medic-client');
          assert.equal(view.args[0][1], 'reports_by_freetext');
          assert.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
          assert.equal(errors.length, 0);
          done();
      });
  });

  it('pass unique validation when doc is the same', done => {
      var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{
              id: 'same',
              doc: { _id: 'same', errors: [] }
          }]
      });
      var validations = [{
          property: 'patient_id',
          rule: 'unique("patient_id")'
      }];
      var doc = {
          _id: 'same',
          patient_id: '111'
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(view.callCount, 1);
          assert.equal(view.args[0][0], 'medic-client');
          assert.equal(view.args[0][1], 'reports_by_freetext');
          assert.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
          assert.equal(errors.length, 0);
          done();
      });
  });

  it('pass unique validation when doc has errors', done => {
      var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{ id: 'different' }]
      });
      var fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [{
              id: 'different',
              doc: { errors: [{ foo: 'bar' }] }
          }]
      });
      var validations = [{
          property: 'patient_id',
          rule: 'unique("patient_id")'
      }];
      var doc = {
          _id: 'same',
          patient_id: '111'
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(view.callCount, 1);
          assert.equal(view.args[0][0], 'medic-client');
          assert.equal(view.args[0][1], 'reports_by_freetext');
          assert.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
          assert.equal(fetch.callCount, 1);
          assert.deepEqual(fetch.args[0][0], { keys: [ 'different' ] });
          assert.equal(errors.length, 0);
          done();
      });
  });

  it('fail unique validation on doc with no errors', done => {
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{ id: 'different' }]
      });
      sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [{
              id: 'different',
              doc: { _id: 'different', errors: [] }
          }]
      });
      var validations = [{
          property: 'xyz',
          rule: 'unique("xyz")',
          message: [{
              content: 'Duplicate: {{xyz}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          xyz: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.deepEqual(errors, [{
              code: 'invalid_xyz_unique',
              message: 'Duplicate: {{xyz}}.'
          }]);
          done();
      });
  });

  it('fail multiple field unique validation on doc with no errors', done => {
      var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{ id: 'different' }]
      });
      var fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [{
              id: 'different',
              doc: { _id: 'different', errors: [] }
          }]
      });
      var validations = [{
          property: 'xyz',
          rule: 'unique("xyz","abc")',
          message: [{
              content: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          xyz: '444',
          abc: 'CHeeSE' // value is lowercased as it is in the view map definition
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(view.callCount, 2);
          assert.equal(view.args[0][0], 'medic-client');
          assert.equal(view.args[0][1], 'reports_by_freetext');
          assert.deepEqual(view.args[0][2], { key: ['xyz:444'] });
          assert.equal(view.args[1][0], 'medic-client');
          assert.equal(view.args[1][1], 'reports_by_freetext');
          assert.deepEqual(view.args[1][2], { key: ['abc:cheese'] });
          assert.equal(fetch.callCount, 1);
          assert.deepEqual(fetch.args[0][0], { keys: [ 'different' ] });
          assert.deepEqual(errors, [{
              code: 'invalid_xyz_unique',
              message: 'Duplicate xyz {{xyz}} and abc {{abc}}.'
          }]);
          done();
      });
  });

  it('pass uniqueWithin validation on old doc', done => {
      clock = sinon.useFakeTimers();
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{ id: 'different' }]
      });
      sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [{
              id: 'different',
              doc: {
                  _id: 'different',
                  errors: [],
                  reported_date: moment().subtract(3, 'weeks').valueOf()
              }
          }]
      });
      var validations = [{
          property: 'xyz',
          rule: 'uniqueWithin("xyz","2 weeks")',
          message: [{
              content: 'Duplicate xyz {{xyz}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          xyz: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(errors.length, 0);
          done();
      });
  });

  it('fail uniqueWithin validation on new doc', done => {
      clock = sinon.useFakeTimers();
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [
              { id: 'different1' },
              { id: 'different2' },
              { id: 'different3' }
          ]
      });
      // rows are sorted based on uuid not on date, so we have to check all docs
      sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [
              {
                  id: 'different1',
                  doc: {
                      _id: 'different1',
                      errors: [],
                      reported_date: moment().subtract(3, 'weeks').valueOf()
                  }
              },
              {
                  id: 'different2',
                  doc: {
                      _id: 'different2',
                      errors: [],
                      reported_date: moment().subtract(1, 'weeks').valueOf()
                  }
              },
              {
                  id: 'different3',
                  doc: {
                      _id: 'different3',
                      errors: [],
                      reported_date: moment().subtract(10, 'weeks').valueOf()
                  }
              }
          ]
      });
      var validations = [{
          property: 'xyz',
          rule: 'uniqueWithin("xyz","2 weeks")',
          message: [{
              content: 'Duplicate xyz {{xyz}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          xyz: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.deepEqual(errors, [{
              code: 'invalid_xyz_uniqueWithin',
              message: 'Duplicate xyz {{xyz}}.'
          }]);
          done();
      });
  });

  it('formatParam does not encode unicode', () => {
      assert.equal(validation._formatParam('form', 'द'), 'form:"द"');
  });

  it('formatParam escapes quotes in values', () => {
      assert.equal(
          validation._formatParam('form', ' " AND everything'),
          'form:" \\" AND everything"'
      );
  });

  it('formatParam rejects quotes in field names', () => {
      assert.equal(
          validation._formatParam('*:"everything', 'xyz'),
          '*:everything:"xyz"'
      );
  });

  it('formatParam quotes strings', () => {
      assert.equal(
          validation._formatParam('birds', 'pigeon'),
          'birds:"pigeon"'
      );
  });

  it('formatParam use <int> query on integers', () => {
      assert.equal(
          validation._formatParam('lmp', 11),
          'lmp<int>:11'
      );
  });

  it('pass exists validation when matching document', done => {
      var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{ id: 'different' }]
      });
      sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
          rows: [{
              id: 'different',
              doc: { _id: 'different', errors: [] }
          }]
      });
      var validations = [{
          property: 'parent_id',
          rule: 'exists("REGISTRATION", "patient_id")',
          message: [{
              content: 'Unknown patient {{parent_id}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          patient_id: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.equal(view.callCount, 2);
          assert.equal(view.args[0][0], 'medic-client');
          assert.equal(view.args[0][1], 'reports_by_freetext');
          assert.deepEqual(view.args[0][2], { key: ['patient_id:444'] });
          assert.equal(view.args[1][0], 'medic-client');
          assert.equal(view.args[1][1], 'reports_by_freetext');
          assert.deepEqual(view.args[1][2], { key: ['form:registration'] });
          assert.deepEqual(errors, []);
          done();
      });
  });

  it('fail exists validation when no matching document', done => {
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: []
      });
      var validations = [{
          property: 'parent_id',
          rule: 'exists("REGISTRATION", "patient_id")',
          message: [{
              content: 'Unknown patient {{parent_id}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          parent_id: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.deepEqual(errors, [{
              code: 'invalid_parent_id_exists',
              message: 'Unknown patient {{parent_id}}.'
          }]);
          done();
      });
  });

  it('fail exists validation when matching document is same as this', done => {
      sinon.stub(db.medic, 'view').callsArgWith(3, null, {
          rows: [{
              id: 'same',
              doc: { _id: 'same', errors: [] }
          }]
      });
      var validations = [{
          property: 'parent_id',
          rule: 'exists("REGISTRATION", "patient_id")',
          message: [{
              content: 'Unknown patient {{parent_id}}.',
              locale: 'en'
          }]
      }];
      var doc = {
          _id: 'same',
          parent_id: '444'
      };
      validation.validate(doc, validations, function(errors) {
          assert.deepEqual(errors, [{
              code: 'invalid_parent_id_exists',
              message: 'Unknown patient {{parent_id}}.'
          }]);
          done();
      });
  });
});
