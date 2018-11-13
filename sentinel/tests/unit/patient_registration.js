const _ = require('underscore'),
  moment = require('moment'),
  sinon = require('sinon'),
  assert = require('chai').assert,
  transition = require('../../src/transitions/registration'),
  db = require('../../src/db-nano'),
  dbPouch = require('../../src/db-pouch'),
  utils = require('../../src/lib/utils'),
  transitionUtils = require('../../src/transitions/utils'),
  date = require('../../src/date');

const getMessage = (doc, idx) => {
  if (!doc || !doc.tasks) {
    return;
  }
  if (!idx) {
    return _.first(_.first(doc.tasks).messages);
  }
  if (doc.tasks[idx]) {
    return _.first(doc.tasks[idx].messages);
  }
};

describe('patient registration', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    sinon.stub(transition, 'getConfig').returns([
      {
        form: 'PATR',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient_id',
            params: '',
            bool_expr: '',
          },
        ],
        validations: [
          {
            property: 'patient_name',
            rule: 'lenMin(1) && lenMax(100)',
            message: 'Invalid patient name.',
          },
        ],
        messages: [
          {
            message: [
              {
                content: 'thanks {{contact.name}}',
                locale: 'en',
              },
              {
                content: 'gracias {{contact.name}}',
                locale: 'es',
              },
            ],
            recipient: 'reporting_unit',
          },
          {
            message: [
              {
                content: 'thanks {{fields.caregiver_name}}',
                locale: 'en',
              },
              {
                content: 'gracias {{fields.caregiver_name}}',
                locale: 'es',
              },
            ],
            recipient: 'caregiver_phone',
          },
        ],
      },
      {
        form: 'P',
        validations: {
          join_responses: true,
          list: [
            {
              property: 'last_menstrual_period',
              rule: 'integer && between(2,42)',
              message: [
                {
                  content: 'Something something {{patient_name}}',
                  locale: 'en',
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  it('getWeeksSinceLMP returns 0 not NaN or null', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 0);
    assert.equal(
      typeof transition.getWeeksSinceLMP({ fields: { lmp: 0 } }),
      'number'
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }),
      0
    );
    assert.equal(
      typeof transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }),
      'number'
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }),
      0
    );
    assert.equal(
      typeof transition.getWeeksSinceLMP({
        fields: { last_menstrual_period: 0 },
      }),
      'number'
    );
  });

  it('getWeeksSinceLMP always returns number', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
  });

  it('getWeeksSinceLMP supports three property names', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { last_menstrual_period: '12' } }),
      12
    );
  });

  it('getYearsSinceDOB supports three property names', () => {
    assert.equal(
      transition.getYearsSinceDOB({ fields: { years_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getYearsSinceDOB({ fields: { years_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getYearsSinceDOB({ fields: { age_in_years: '12' } }),
      12
    );
  });

  it('getMonthsSinceDOB supports three property names', () => {
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { months_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { months_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { age_in_months: '12' } }),
      12
    );
  });

  it('getWeeksSinceDOB supports four property names', () => {
    assert.equal(transition.getWeeksSinceDOB({ fields: { dob: '12' } }), 12);
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { weeks_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { weeks_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { age_in_weeks: '12' } }),
      12
    );
  });

  it('getDaysSinceDOB supports three property names', () => {
    assert.equal(
      transition.getDaysSinceDOB({ fields: { days_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getDaysSinceDOB({ fields: { days_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getDaysSinceDOB({ fields: { age_in_days: '12' } }),
      12
    );
  });

  it('getDOB uses weeks since dob if available', () => {
    const today = 1474942416907,
      expected = moment(today)
        .startOf('day')
        .subtract(5, 'weeks')
        .valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns('5');
    assert.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  });

  it('getDOB uses days since dob if available', () => {
    const today = 1474942416907,
      expected = moment(today)
        .startOf('day')
        .subtract(5, 'days')
        .valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
    sinon.stub(transition, 'getDaysSinceDOB').returns('5');
    assert.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  });

  it('getDOB falls back to today if necessary', () => {
    const today = 1474942416907,
      expected = moment(today)
        .startOf('day')
        .valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
    sinon.stub(transition, 'getDaysSinceDOB').returns(undefined);
    assert.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  });

  it('valid form adds patient_id and patient document', () => {
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);

    sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
      doc.patient_id = 12345;
      callback();
    });

    const doc = {
      _id: 'docid',
      form: 'PATR',
      fields: { patient_name: 'abc' },
      reported_date: 'now',
    };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
      rows: [
        {
          doc: {
            _id: 'the-contact',
            parent: {
              _id: 'the-parent',
            },
          },
        },
      ],
    });
    const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArg(1);

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.patient_id);
      assert(saveDoc.called);

      assert.deepEqual(saveDoc.args[0][0], {
        name: 'abc',
        parent: {
          _id: 'the-parent',
        },
        reported_date: 'now',
        type: 'person',
        patient_id: doc.patient_id,
        created_by: 'the-contact',
        source_id: 'docid',
      });
    });
  });

  it('registration sets up responses', () => {
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon
      .stub(utils, 'getPatientContact')
      .callsArgWith(2, null, { _id: 'uuid' });
    sinon
      .stub(utils, 'getPatientContactUuid')
      .callsArgWith(2, null, { _id: 'uuid' });
    sinon.stub(transitionUtils, 'addUniqueId').callsArgWith(1);

    const doc = {
      form: 'PATR',
      from: '+1234',
      fields: {
        patient_name: 'foo',
        caregiver_name: 'Sam',
        caregiver_phone: '+987',
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
      },
      locale: 'en',
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 2);

      const msg0 = getMessage(doc, 0);
      assert(msg0);
      assert(msg0.uuid);
      assert(msg0.to);
      assert(msg0.message);
      if (msg0) {
        delete msg0.uuid;
        assert.deepEqual(msg0, {
          to: '+1234',
          message: 'thanks Julie',
        });
      }

      /*
       * Also checks that recipient using doc property value is handled
       * resolved correctly
       * */
      const msg1 = getMessage(doc, 1);
      assert(msg1);
      assert(msg1.uuid);
      assert(msg1.to);
      assert(msg1.message);
      if (msg1) {
        delete msg1.uuid;
        assert.deepEqual(msg1, {
          to: '+987',
          message: 'thanks Sam',
        });
      }
    });
  });

  it('registration responses support locale', () => {
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon
      .stub(utils, 'getPatientContact')
      .callsArgWith(2, null, { _id: 'uuid' });
    sinon
      .stub(utils, 'getPatientContactUuid')
      .callsArgWith(2, null, { _id: 'uuid' });
    sinon.stub(transitionUtils, 'addUniqueId').callsArgWith(1);

    const doc = {
      form: 'PATR',
      fields: {
        patient_name: 'foo',
        caregiver_name: 'Sam',
        caregiver_phone: '+987',
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
        parent: {
          contact: {
            phone: '+1234',
            name: 'Julie',
          },
        },
      },
      locale: 'es', //spanish
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 2);

      const msg0 = getMessage(doc, 0);
      assert(msg0);
      assert(msg0.uuid);
      assert(msg0.to);
      assert(msg0.message);
      if (msg0) {
        delete msg0.uuid;
        assert.deepEqual(msg0, {
          to: '+1234',
          message: 'gracias Julie',
        });
      }

      /*
       * Also checks that recipient using doc property value is resolved
       * correctly.
       * */
      const msg1 = getMessage(doc, 1);
      assert(msg1);
      assert(msg1.uuid);
      assert(msg1.to);
      assert(msg1.message);
      if (msg1) {
        delete msg1.uuid;
        assert.deepEqual(msg1, {
          to: '+987',
          message: 'gracias Sam',
        });
      }
    });
  });

  it('registration errors receive patient context', () => {
    const doc = {
      form: 'P',
      fields: {
        patient_id: '123456',
        last_menstrual_period: 60,
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
        parent: {
          contact: {
            phone: '+1234',
            name: 'Julie',
          },
        },
      },
      patient: {
        name: 'Maria',
      },
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);

      assert(doc.errors);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'invalid_last_menstrual_period');
      assert.equal(doc.errors[0].message, 'Something something Maria');
    });
  });
});
