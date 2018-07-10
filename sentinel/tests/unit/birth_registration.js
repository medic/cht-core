var transition = require('../../src/transitions/registration'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    moment = require('moment'),
    transitionUtils = require('../../src/transitions/utils'),
    utils = require('../../src/lib/utils');

describe('birth registration', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'BIR',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           },
           {
               name: 'on_create',
               trigger: 'add_birth_date',
               params: '',
               bool_expr: ''
           }
        ],
        validations: [
            {
                property: 'weeks_since_birth',
                rule: 'min(0) && max(52)',
                message: [{
                    content: 'Invalid DOB; must be between 0-52 weeks.',
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
    }]);
  });

  it('setBirthDate sets birth_date correctly for weeks_since_birth: 0', () => {
      var doc = { fields: { weeks_since_birth: 0 } },
          expected = moment().startOf('day').toISOString();
      transition.setBirthDate(doc);
      assert(doc.birth_date);
      assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for age_in_weeks 10', () => {
      var doc = { fields: { age_in_weeks: 10 } },
          expected = moment().startOf('day').subtract(10, 'weeks').toISOString();
      transition.setBirthDate(doc);
      assert(doc.birth_date);
      assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for days_since_birth: 0', () => {
      var doc = { fields: { days_since_birth: 0 } },
          expected = moment().startOf('day').toISOString();
      transition.setBirthDate(doc);
      assert(doc.birth_date);
      assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for age_in_days: 10', () => {
      var doc = { fields: { age_in_days: 10 } },
          expected = moment().startOf('day').subtract(10, 'days').toISOString();
      transition.setBirthDate(doc);
      assert(doc.birth_date);
      assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate does not set birthdate if no fields given', () => {
      var doc = { };
      transition.setBirthDate(doc);
      assert.equal(doc.birth_date, undefined);
  });

  it('valid form adds patient_id and expected_date', () => {
      // doc already exists bc we aren't testing the create patient step
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'UUID'});

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
          doc.patient_id = 12345;
          callback();
      });

      var doc = {
          form: 'BIR',
          fields: {
              patient_name: 'abc',
              weeks_since_birth: 1
          }
      };
      return transition.onMatch({ doc: doc }).then(changed => {
          assert.equal(changed, true);
          assert(doc.patient_id);
          assert(doc.birth_date);
          assert.equal(doc.tasks, undefined);
      });
  });
});
