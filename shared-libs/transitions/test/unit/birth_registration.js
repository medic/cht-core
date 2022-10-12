const sinon = require('sinon');
const assert = require('chai').assert;
const rewire = require('rewire');
const  moment = require('moment');
const utils = require('../../src/lib/utils');
const config = require('../../src/config');

describe('birth registration', () => {
  let transitionUtils;
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub().returns([{
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
      }]),
    });
    transitionUtils = require('../../src/transitions/utils');
    transition = rewire('../../src/transitions/registration');
    transition.setBirthDate = transition.__get__('setBirthDate');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('setBirthDate sets birth_date correctly for weeks_since_birth: 0', () => {
    const doc = { fields: { weeks_since_birth: 0 } };
    const expected = moment().startOf('day').toISOString();
    transition.setBirthDate(doc);
    assert(doc.birth_date);
    assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for age_in_weeks 10', () => {
    const doc = { fields: { age_in_weeks: 10 } };
    const expected = moment().startOf('day').subtract(10, 'weeks').toISOString();
    transition.setBirthDate(doc);
    assert(doc.birth_date);
    assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for days_since_birth: 0', () => {
    const doc = { fields: { days_since_birth: 0 } };
    const expected = moment().startOf('day').toISOString();
    transition.setBirthDate(doc);
    assert(doc.birth_date);
    assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate sets birth_date correctly for age_in_days: 10', () => {
    const doc = { fields: { age_in_days: 10 } };
    const expected = moment().startOf('day').subtract(10, 'days').toISOString();
    transition.setBirthDate(doc);
    assert(doc.birth_date);
    assert.equal(doc.birth_date, expected);
  });

  it('setBirthDate does not set birthdate if no fields given', () => {
    const doc = { };
    transition.setBirthDate(doc);
    assert.equal(doc.birth_date, undefined);
  });

  it('valid form adds patient_id and expected_date', () => {
    // doc already exists bc we aren't testing the create patient step
    sinon.stub(utils, 'getContactUuid').resolves('UUID');

    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);

    const doc = {
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
