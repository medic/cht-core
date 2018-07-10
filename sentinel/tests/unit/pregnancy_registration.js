var _ = require('underscore'),
    transition = require('../../src/transitions/registration'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    moment = require('moment'),
    transitionUtils = require('../../src/transitions/utils'),
    utils = require('../../src/lib/utils');

const getMessage = doc => {
    if (!doc || !doc.tasks) {
        return;
    }
    return _.first(_.first(doc.tasks).messages).message;
};

describe('patient registration', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'p',
        type: 'pregnancy',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           },
           {
               name: 'on_create',
               trigger: 'add_expected_date',
               params: '',
               bool_expr: 'typeof doc.getid === "undefined"'
           }
        ],
        validations: {
            join_responses: true,
            list: [
                {
                    property: 'lmp',
                    rule: 'min(0) && max(40)',
                    message: [{
                        content: 'Invalid LMP; must be between 0-40 weeks.',
                        locale: 'en'
                    }]
                },
                {
                    property: 'patient_name',
                    rule: 'lenMin(1) && lenMax(100)',
                    message: [{
                        content: 'Invalid patient name.',
                        locale: 'en'
                    }]
                }
            ]
        }
    },{
        // Pregnancy for existing patient
        form: 'ep',
        type: 'pregnancy',
        events: [
           // See, no patient id creation!
           // {
           //     name: 'on_create',
           //     trigger: 'add_patient_id',
           //     params: '',
           //     bool_expr: ''
           // },
           {
               name: 'on_create',
               trigger: 'add_expected_date',
               params: '',
               bool_expr: 'typeof doc.getid === "undefined"'
           }
        ],
        validations: {
            join_responses: true,
            list: [
                {
                    property: 'lmp',
                    rule: 'min(0) && max(40)',
                    message: [{
                        content: 'Invalid LMP; must be between 0-40 weeks.',
                        locale: 'en'
                    }]
                },
                {
                    property: 'patient_id',
                    rule: 'len(5)',
                    message: [{
                        content: 'Invalid patient Id.',
                        locale: 'en'
                    }]
                }
            ]
        }
    }]);
  });

  it('filter fails with empty doc', () => {
      assert(!transition.filter({}));
  });

  it('filter fails with no clinic phone and private form', () => {
      var doc = { form: 'p', type: 'data_record'};
      sinon.stub(utils, 'getClinicPhone').returns(null);
      sinon.stub(utils, 'getForm').returns({ public_form: false });
      assert(!transition.filter(doc));
  });

  it('filter does not fail if doc has errors', () => {
      var doc = { form: 'p', type: 'data_record', errors: [ 'some error ' ] };
      sinon.stub(utils, 'getClinicPhone').returns('somephone');
      sinon.stub(utils, 'getForm').returns({ public_form: true });
      assert(transition.filter(doc));
  });

  it('filter fails if form is unknown', () => {
      var doc = { form: 'x' , type: 'data_record'};
      sinon.stub(utils, 'getClinicPhone').returns('somephone');
      assert(!transition.filter(doc));
  });

  it('filter succeeds with no clinic phone if public form', () => {
      var doc = { form: 'p' , type: 'data_record'};
      sinon.stub(utils, 'getClinicPhone').returns(null);
      sinon.stub(utils, 'getForm').returns({ public_form: true });
      assert(transition.filter(doc));
  });

  it('filter succeeds with populated doc', () => {
      var doc = { form: 'p' , type: 'data_record'};
      sinon.stub(utils, 'getClinicPhone').returns('somephone');
      sinon.stub(utils, 'getForm').returns({});
      assert(transition.filter(doc));

  });

  it('is id only', () => {
      assert.equal(transition.isIdOnly({}), false);
      assert.equal(transition.isIdOnly({
          getid: undefined
      }), false);
      assert.equal(transition.isIdOnly({
          getid: ''
      }), false);
      assert.equal(transition.isIdOnly({
          getid: 'x'
      }), true);

  });

  it('setExpectedBirthDate sets lmp_date and expected_date to null when lmp 0', () => {
      var doc = { fields: { lmp: 0 }, type: 'data_record' };
      transition.setExpectedBirthDate(doc);
      assert.equal(doc.lmp_date, null);
      assert.equal(doc.expected_date, null);

  });

  it('setExpectedBirthDate sets lmp_date and expected_date correctly for lmp: 10', () => {
      var doc = { fields: { lmp: '10', type: 'data_record'} },
          start = moment().startOf('day');

      transition.setExpectedBirthDate(doc);

      assert(doc.lmp_date);
      assert.equal(doc.lmp_date, start.clone().subtract(10, 'weeks').toISOString());
      assert.equal(doc.expected_date, start.clone().add(30, 'weeks').toISOString());


  });

  it('valid adds lmp_date and patient_id', () => {
      var start = moment().startOf('day').subtract(5, 'weeks');

      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
          doc.patient_id = 12345;
          callback();
      });

      const doc = {
          form: 'p',
          type: 'data_record',
          fields: {
              patient_name: 'abc',
              lmp: 5
          }
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.lmp_date, start.toISOString());
          assert(doc.patient_id);
          assert.equal(doc.tasks, undefined);

      });
  });

  it('pregnancies on existing patients fail without valid patient id', () => {
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);

      const doc = {
          form: 'ep',
          type: 'data_record',
          fields: {
              patient_id: '12345',
              lmp: 5
          }
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.errors.length, 1);
          assert.equal(doc.errors[0].message, 'messages.generic.registration_not_found');

      });
  });

  it('pregnancies on existing patients succeeds with a valid patient id', () => {
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

      const doc = {
          form: 'ep',
          type: 'data_record',
          fields: {
              patient_id: '12345',
              lmp: 5
          }
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert(!doc.errors);

      });
  });


  it('zero lmp value only registers patient', () => {
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
          doc.patient_id = 12345;
          callback();
      });

      const doc = {
          form: 'p',
          type: 'data_record',
          fields: {
              patient_name: 'abc',
              lmp: 0
          }
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.lmp_date, null);
          assert(doc.patient_id);
          assert.equal(doc.tasks, undefined);

      });
  });

  it('id only logic with valid name', () => {
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
          doc.patient_id = 12345;
          callback();
      });

      const doc = {
          form: 'p',
          type: 'data_record',
          fields: {
              patient_name: 'abc',
              lmp: 5
          },
          getid: 'x'
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.lmp_date, undefined);
          assert(doc.patient_id);


      });
  });

  it('id only logic with invalid name', () => {
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

      const doc = {
          form: 'p',
          from: '+12345',
          type: 'data_record',
          fields: {
              patient_name: '',
              lmp: 5
          },
          getid: 'x'
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.patient_id, undefined);
          assert(doc.tasks);
          assert.equal(getMessage(doc), 'Invalid patient name.');

      });
  });

  it('invalid name valid LMP logic', () => {
      const doc = {
          form: 'p',
          from: '+1234',
          type: 'data_record',
          fields: {
              patient_name: '',
              lmp: 5
          }
      };

      transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.patient_id, undefined);
          assert.equal(getMessage(doc), 'Invalid patient name.');


      });
  });

  it('valid name invalid LMP logic', () => {
      const doc = {
          form: 'p',
          from: '+1234',
          type: 'data_record',
          fields: {
              patient_name: 'hi',
              lmp: 45
          }
      };

      return transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.patient_id, undefined);
          assert.equal(getMessage(doc), 'Invalid LMP; must be between 0-40 weeks.');
      });
  });

  it('invalid name invalid LMP logic', () => {
      const doc = {
          form: 'p',
          from: '+123',
          type: 'data_record',
          fields: {
              patient_name: '',
              lmp: 45
          }
      };

      return transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(doc.patient_id, undefined);
          assert.equal(getMessage(doc), 'Invalid patient name.  Invalid LMP; must be between 0-40 weeks.');
      });
  });

  it('mismatched form returns false', () => {
      const doc = {
          form: 'x',
          type: 'data_record'
      };
      return transition.onMatch({ doc: doc }).catch(function() {

      });
  });

  it('missing all fields returns validation errors', () => {
      const doc = {
          form: 'p',
          from: '+123',
          type: 'data_record'
      };
      return transition.onMatch({ doc: doc }).then(function(changed) {
          assert.equal(changed, true);
          assert.equal(
              getMessage(doc),
              'Invalid LMP; must be between 0-40 weeks.  Invalid patient name.'
          );
      });
  });

});
