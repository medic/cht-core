const _ = require('underscore'),
      moment = require('moment'),
      sinon = require('sinon').sandbox.create(),
      transition = require('../../transitions/registration'),
      db = require('../../db-nano'),
      utils = require('../../lib/utils'),
      transitionUtils = require('../../transitions/utils'),
      date = require('../../date');

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

exports.setUp = callback => {
  sinon.stub(transition, 'getConfig').returns([{
    form: 'PATR',
    events: [
      {
        name: 'on_create',
        trigger: 'add_patient_id',
        params: '',
        bool_expr: ''
      }
    ],
    validations: [
      {
        property: 'patient_name',
        rule: 'lenMin(1) && lenMax(100)',
        message: 'Invalid patient name.'
      }
    ],
    messages: [
      {
        message: [
          {
            content: 'thanks {{contact.name}}',
            locale: 'en'
          },
          {
            content: 'gracias {{contact.name}}',
            locale: 'es'
          }
        ],
        recipient: 'reporting_unit',
      },
      {
        message: [
          {
            content: 'thanks {{fields.caregiver_name}}',
            locale: 'en'
          },
          {
            content: 'gracias {{fields.caregiver_name}}',
            locale: 'es'
          }
        ],
        recipient: 'caregiver_phone',
      }
    ]
  }, {
    form: 'P',
    validations: {
      join_responses: true,
      list: [{
        property: 'last_menstrual_period',
        rule: 'integer && between(2,42)',
        message: [{
          content: 'Something something {{patient_name}}',
          locale: 'en'
        }]
      }]
    }
  }]);
  callback();
};

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['getWeeksSinceLMP returns 0 not NaN or null'] = test => {
  test.equal(transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 0);
  test.equal(typeof transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 'number');
  test.equal(transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }), 0);
  test.equal(typeof transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }), 'number');
  test.equal(transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }), 0);
  test.equal(typeof transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }), 'number');
  test.done();
};

exports['getWeeksSinceLMP always returns number'] = test => {
  test.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
  test.done();
};

exports['getWeeksSinceLMP supports three property names'] = test => {
  test.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
  test.equal(transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: '12' } }), 12);
  test.equal(transition.getWeeksSinceLMP({ fields: { last_menstrual_period: '12' } }), 12);
  test.done();
};

exports['getWeeksSinceDOB supports four property names'] = test => {
  test.equal(transition.getWeeksSinceDOB({ fields: { dob: '12' } }), 12);
  test.equal(transition.getWeeksSinceDOB({ fields: { weeks_since_dob: '12' } }), 12);
  test.equal(transition.getWeeksSinceDOB({ fields: { weeks_since_birth: '12' } }), 12);
  test.equal(transition.getWeeksSinceDOB({ fields: { age_in_weeks: '12' } }), 12);
  test.done();
};

exports['getDaysSinceDOB supports three property names'] = test => {
  test.equal(transition.getDaysSinceDOB({ fields: { days_since_dob: '12' } }), 12);
  test.equal(transition.getDaysSinceDOB({ fields: { days_since_birth: '12' } }), 12);
  test.equal(transition.getDaysSinceDOB({ fields: { age_in_days: '12' } }), 12);
  test.done();
};

exports['getDOB uses weeks since dob if available'] = test => {
  const today = 1474942416907,
        expected = moment(today).startOf('day').subtract(5, 'weeks').valueOf();
  sinon.stub(date, 'getDate').returns(today);
  sinon.stub(transition, 'getWeeksSinceDOB').returns('5');
  test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  test.done();
};

exports['getDOB uses days since dob if available'] = test => {
  const today = 1474942416907,
        expected = moment(today).startOf('day').subtract(5, 'days').valueOf();
  sinon.stub(date, 'getDate').returns(today);
  sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
  sinon.stub(transition, 'getDaysSinceDOB').returns('5');
  test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  test.done();
};

exports['getDOB falls back to today if necessary'] = test => {
  const today = 1474942416907,
        expected = moment(today).startOf('day').valueOf();
  sinon.stub(date, 'getDate').returns(today);
  sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
  sinon.stub(transition, 'getDaysSinceDOB').returns(undefined);
  test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  test.done();
};

exports['valid form adds patient_id and patient document'] = test => {

  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);

  sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
    doc.patient_id = 12345;
    callback();
  });

  const doc = {
    _id: 'docid',
    form: 'PATR',
    fields: { patient_name: 'abc' },
    reported_date: 'now'
  };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [
    {
      doc: {
        _id: 'the-contact',
        parent: {
          _id: 'the-parent'
        }
      }
    }
  ]});
  const saveDoc = sinon.stub(db.audit, 'saveDoc').callsArg(1);

  transition.onMatch({ doc: doc }).then(changed => {
    test.equal(changed, true);
    test.ok(doc.patient_id);
    test.ok(saveDoc.called);

    test.deepEqual(saveDoc.args[0][0], {
      name: 'abc',
      parent: {
        _id: 'the-parent'
      },
      reported_date: 'now',
      type: 'person',
      patient_id: doc.patient_id,
      created_by: 'the-contact',
      source_id: 'docid'
    });
    test.done();
  });
};

exports['registration sets up responses'] = test => {

  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, {_id: 'uuid'});
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
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
      name: 'Julie'
    },
    locale: 'en'
  };

  transition.onMatch({ doc: doc }).then(changed => {
    test.equal(changed, true);
    test.ok(doc.tasks);
    test.equal(doc.tasks && doc.tasks.length, 2);

    const msg0 = getMessage(doc, 0);
    test.ok(msg0);
    test.ok(msg0.uuid);
    test.ok(msg0.to);
    test.ok(msg0.message);
    if (msg0) {
      delete msg0.uuid;
      test.deepEqual(msg0, {
        to: '+1234',
        message: 'thanks Julie'
      });
    }

    /*
     * Also checks that recipient using doc property value is handled
     * resolved correctly
     * */
    const msg1 = getMessage(doc, 1);
    test.ok(msg1);
    test.ok(msg1.uuid);
    test.ok(msg1.to);
    test.ok(msg1.message);
    if (msg1) {
      delete msg1.uuid;
      test.deepEqual(msg1, {
        to: '+987',
        message: 'thanks Sam'
      });
    }
    test.done();
  });
};

exports['registration responses support locale'] = test => {

  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, {_id: 'uuid'});
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
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
          name: 'Julie'
        }
      }
    },
    locale: 'es' //spanish
  };

  transition.onMatch({ doc: doc }).then(changed => {
    test.equal(changed, true);
    test.ok(doc.tasks);
    test.equal(doc.tasks && doc.tasks.length, 2);

    const msg0 = getMessage(doc, 0);
    test.ok(msg0);
    test.ok(msg0.uuid);
    test.ok(msg0.to);
    test.ok(msg0.message);
    if (msg0) {
      delete msg0.uuid;
      test.deepEqual(msg0, {
        to: '+1234',
        message: 'gracias Julie'
      });
    }

    /*
     * Also checks that recipient using doc property value is resolved
     * correctly.
     * */
    const msg1 = getMessage(doc, 1);
    test.ok(msg1);
    test.ok(msg1.uuid);
    test.ok(msg1.to);
    test.ok(msg1.message);
    if (msg1) {
      delete msg1.uuid;
      test.deepEqual(msg1, {
        to: '+987',
        message: 'gracias Sam'
      });
    }
    test.done();
  });
};

exports['registration errors receive patient context'] = test => {
  const doc = {
    form: 'P',
    fields: {
      patient_id: '123456',
      last_menstrual_period: 60
    },
    contact: {
      phone: '+1234',
      name: 'Julie',
      parent: {
        contact: {
          phone: '+1234',
          name: 'Julie'
        }
      }
    },
    patient: {
      name: 'Maria'
    }
  };

  transition.onMatch({ doc: doc }).then(changed => {
    test.equal(changed, true);

    test.ok(doc.errors);
    test.equal(doc.errors.length, 1);
    test.equal(doc.errors[0].code, 'invalid_last_menstrual_period');
    test.equal(doc.errors[0].message, 'Something something Maria');
    test.done();
  });
};