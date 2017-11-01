const sinon = require('sinon').sandbox.create(),
      transition = require('../../transitions/registration'),
      transitionUtils = require('../../transitions/utils'),
      utils = require('../../lib/utils'),
      schedules = require('../../lib/schedules'),
      config = require('../../config');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['booleanExpressionFails is false if there is no valid expression'] = test => {
  test.equal(transition._booleanExpressionFails({}, ''), false);
  test.done();
};

exports['booleanExpressionFails is true if the expresison fails'] = test => {
  test.equal(transition._booleanExpressionFails({foo: 'bar'}, `doc.foo !== 'bar'`), true);
  test.done();
};

exports['booleanExpressionFails is true if the expression is invalid'] = test => {
  // TODO: should this error instead of just returning false?
  //       If there is a typo we're not going to know about it
  test.equal(transition._booleanExpressionFails({}, `doc.foo.bar === 'smang'`), true);
  test.done();
};

exports['add_patient trigger creates a new patient'] = test => {
  const patientName = 'jack';
  const submitterId = 'papa';
  const patientId = '05649';
  const senderPhoneNumber = '+555123';
  const dob = '2017-03-31T01:15:09.000Z';
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: senderPhoneNumber,
    fields: { patient_name: patientName },
    birth_date: dob
  } };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
  const getPatientContactUuid = sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'add_patient' } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
    doc.patient_id = patientId;
    callback();
  });

  transition.onMatch(change, db, audit, () => {
    test.equal(getPatientContactUuid.callCount, 1);
    test.equal(view.callCount, 1);
    test.equal(view.args[0][0], 'medic-client');
    test.equal(view.args[0][1], 'contacts_by_phone');
    test.equal(view.args[0][2].key, senderPhoneNumber);
    test.equal(view.args[0][2].include_docs, true);
    test.equal(saveDoc.callCount, 1);
    test.equal(saveDoc.args[0][0].name, patientName);
    test.equal(saveDoc.args[0][0].parent._id, submitterId);
    test.equal(saveDoc.args[0][0].reported_date, 53);
    test.equal(saveDoc.args[0][0].type, 'person');
    test.equal(saveDoc.args[0][0].patient_id, patientId);
    test.equal(saveDoc.args[0][0].date_of_birth, dob);
    test.done();
  });
};

exports['add_patient does nothing when patient already added'] = test => {
  const patientId = '05649';
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    patient_id: patientId,
    reported_date: 53,
    from: '+555123',
    fields: { patient_name: 'jack' }
  } };
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'add_patient_id' } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  transition.onMatch(change, db, audit, () => {
    test.equals(saveDoc.callCount, 0);
    test.done();
  });
};

exports['add_patient uses a given id if configured to'] = test => {
  const patientId = '05648';
  const doc = {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: '+555123',
    fields: { patient_name: 'jack', external_id: patientId},
    birth_date: '2017-03-31T01:15:09.000Z'
  };
  const change = { doc: doc };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'add_patient_id',
      params: '{"patient_id_field": "external_id"}'
    } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, true);

  transition.onMatch(change, db, audit, () => {
    test.equal(saveDoc.args[0][0].patient_id, patientId);
    test.equal(doc.patient_id, patientId);
    test.equal(doc.errors, undefined);
    test.done();
  });
};

exports['add_patient errors if the configuration doesnt point to an id'] = test => {
  const patientId = '05648';
  const doc = {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: '+555123',
    fields: { patient_name: 'jack', external_id: patientId},
    birth_date: '2017-03-31T01:15:09.000Z'
  };
  const change = { doc: doc };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'add_patient',
      params: '{"patient_id_field": "not_the_external_id"}'
    } ]
  };
  const configGet = sinon.stub(config, 'get');
  configGet.withArgs('outgoing_deny_list').returns('');
  configGet.returns([ eventConfig ]);

  sinon.stub(transition, 'validate').callsArgWith(2);

  transition.onMatch(change, db, audit, () => {
    test.equal(doc.patient_id, undefined);
    test.deepEqual(doc.errors, [{
      message: 'messages.generic.no_provided_patient_id',
      code: 'no_provided_patient_id'
    }]);
    test.done();
  });
};

exports['add_patient errors if the given id is not unique'] = test => {
  const patientId = '05648';
  const doc = {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: '+555123',
    fields: { patient_name: 'jack', external_id: patientId},
    birth_date: '2017-03-31T01:15:09.000Z'
  };
  const change = { doc: doc };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'add_patient',
      params: '{"patient_id_field": "external_id"}'
    } ]
  };
  const configGet = sinon.stub(config, 'get');
  configGet.withArgs('outgoing_deny_list').returns('');
  configGet.returns([ eventConfig ]);

  sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, false);

  sinon.stub(transition, 'validate').callsArgWith(2);

  transition.onMatch(change, db, audit, () => {
    test.equal(doc.patient_id, undefined);
    test.deepEqual(doc.errors, [{
      message: 'messages.generic.provided_patient_id_not_unique',
      code: 'provided_patient_id_not_unique'
    }]);
    test.done();
  });
};

exports['add_patient event parameter overwrites the default property for the name of the patient'] = test => {
  const patientName = 'jack';
  const submitterId = 'papa';
  const patientId = '05649';
  const senderPhoneNumber = '+555123';
  const dob = '2017-03-31T01:15:09.000Z';
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: senderPhoneNumber,
    fields: { name: patientName },
    birth_date: dob
  } };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'add_patient', params: 'name' } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

  sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
    doc.patient_id = patientId;
    callback();
  });

  transition.onMatch(change, db, audit, () => {
    test.equals(saveDoc.callCount, 1);
    test.equals(saveDoc.args[0][0].name, patientName);
    test.done();
  });
};

exports['add_patient event parameter overwrites the default property for the name of the patient using JSON config'] = test => {
  const patientName = 'jack';
  const submitterId = 'papa';
  const patientId = '05649';
  const senderPhoneNumber = '+555123';
  const dob = '2017-03-31T01:15:09.000Z';
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: senderPhoneNumber,
    fields: { name: patientName },
    birth_date: dob
  } };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'add_patient', params: '{"patient_name_field": "name"}' } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

  sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
    doc.patient_id = patientId;
    callback();
  });

  transition.onMatch(change, db, audit, () => {
    test.equals(saveDoc.callCount, 1);
    test.equals(saveDoc.args[0][0].name, patientName);
    test.done();
  });
};

exports['add_patient and add_patient_id triggers are idempotent'] = test => {
  const patientName = 'jack';
  const submitterId = 'papa';
  const patientId = '05649';
  const senderPhoneNumber = '+555123';
  const dob = '2017-03-31T01:15:09.000Z';
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: senderPhoneNumber,
    fields: { name: patientName },
    birth_date: dob
  } };
  // return expected view results when searching for contacts_by_phone
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [
      { name: 'on_create', trigger: 'add_patient', params: 'name' },
      { name: 'on_create', trigger: 'add_patient_id', params: 'name' }
    ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

  sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
    doc.patient_id = patientId;
    callback();
  });

  transition.onMatch(change, db, audit, () => {
    test.equals(saveDoc.callCount, 1);
    test.equals(saveDoc.args[0][0].name, patientName);
    test.done();
  });
};


exports['assign_schedule event creates the named schedule'] = test => {
  const change = { doc: {
    type: 'data_record',
    form: 'R',
    reported_date: 53,
    from: '+555123',
    fields: { patient_id: '05649' }
  } };
  const view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
  const db = { medic: { view: view } };
  const saveDoc = sinon.stub().callsArgWith(1);
  const audit = { saveDoc: saveDoc };
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'assign_schedule', params: 'myschedule' } ]
  };
  sinon.stub(config, 'get').returns([ eventConfig ]);
  sinon.stub(transition, 'validate').callsArgWith(2);
  const getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [ { _id: 'xyz' } ]);
  sinon.stub(schedules, 'getScheduleConfig').returns('someschedule');
  sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
  const assignSchedule = sinon.stub(schedules, 'assignSchedule').returns(true);
  transition.onMatch(change, db, audit, () => {
    test.equals(assignSchedule.callCount, 1);
    test.equals(assignSchedule.args[0][1], 'someschedule');
    test.equals(assignSchedule.args[0][2][0]._id, 'xyz');
    test.equals(getRegistrations.callCount, 1);
    test.done();
  });
};

exports['filter returns false for reports for unknown json form'] = test => {
  const doc = { form: 'R', type: 'data_record'};
  const getForm = sinon.stub(utils, 'getForm').returns(null);
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(actual, false);
  test.done();
};

exports['filter returns false for reports with no registration configured'] = test => {
  const doc = { form: 'R', type: 'data_record' };
  const getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
  const configGet = sinon.stub(config, 'get').returns([{ form: 'XYZ' }]);
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(configGet.callCount, 1);
  test.equals(configGet.args[0][0], 'registrations');
  test.equals(actual, false);
  test.done();
};

exports['filter returns true for reports from known clinic'] = test => {
  const doc = { form: 'R', type: 'data_record'};
  const getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
  const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
  const getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns('+55555555');
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(configGet.callCount, 1);
  test.equals(configGet.args[0][0], 'registrations');
  test.equals(getClinicPhone.callCount, 1);
  test.equals(actual, true);
  test.done();
};

exports['filter returns false for reports from unknown clinic'] = test => {
  const doc = { form: 'R', type: 'data_record'};
  const getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
  const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
  const getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(configGet.callCount, 1);
  test.equals(configGet.args[0][0], 'registrations');
  test.equals(getClinicPhone.callCount, 1);
  test.equals(actual, false);
  test.done();
};

exports['filter returns true for reports for public forms from unknown clinic'] = test => {
  const doc = { form: 'R', type: 'data_record'};
  const getForm = sinon.stub(utils, 'getForm').returns({ public_form: true });
  const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
  const getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(configGet.callCount, 1);
  test.equals(configGet.args[0][0], 'registrations');
  test.equals(getClinicPhone.callCount, 1);
  test.equals(actual, true);
  test.done();
};

exports['filter returns true for xforms reports'] = test => {
  const doc = { form: 'R', content_type: 'xml', type: 'data_record' };
  const getForm = sinon.stub(utils, 'getForm').returns(null);
  const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
  const actual = transition.filter(doc);
  test.equals(getForm.callCount, 1);
  test.equals(getForm.args[0][0], 'R');
  test.equals(configGet.callCount, 1);
  test.equals(configGet.args[0][0], 'registrations');
  test.equals(actual, true);
  test.done();
};

exports['trigger param configuration supports strings'] = test => {
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'testparamparsing', params: 'foo' } ]
  };

  transition.triggers.testparamparsing = (options, cb) => {
    cb(options);
  };

  transition.fireConfiguredTriggers({}, {}, eventConfig, {}, options => {
    test.deepEqual(options.params, ['foo']);

    test.done();
  });
};

exports['trigger param configuration supports comma-delimited strings as array'] = test => {
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'testparamparsing', params: 'foo,bar' } ]
  };

  transition.triggers.testparamparsing = (options, cb) => {
    cb(options);
  };

  transition.fireConfiguredTriggers({}, {}, eventConfig, {}, options => {
    test.deepEqual(options.params, ['foo', 'bar']);

    test.done();
  });
};

exports['trigger param configuration supports arrays as a string'] = test => {
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'testparamparsing', params: '["foo","bar", 3]' } ]
  };

  transition.triggers.testparamparsing = (options, cb) => {
    cb(options);
  };

  transition.fireConfiguredTriggers({}, {}, eventConfig, {}, options => {
    test.deepEqual(options.params, ['foo', 'bar', 3]);

    test.done();
  });
};

exports['trigger param configuration supports JSON as a string'] = test => {
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'testparamparsing', params: '{"foo": "bar"}' } ]
  };

  transition.triggers.testparamparsing = (options, cb) => {
    cb(options);
  };

  transition.fireConfiguredTriggers({}, {}, eventConfig, {}, options => {
    test.deepEqual(options.params, {foo: 'bar'});

    test.done();
  });
};

exports['trigger param configuration supports direct JSON'] = test => {
  const eventConfig = {
    form: 'R',
    events: [ { name: 'on_create', trigger: 'testparamparsing', params: {foo: 'bar'} } ]
  };

  transition.triggers.testparamparsing = (options, cb) => {
    cb(options);
  };

  transition.fireConfiguredTriggers({}, {}, eventConfig, {}, options => {
    test.deepEqual(options.params, {foo: 'bar'});

    test.done();
  });
};

exports['trigger param configuration fails with no parameters'] = test => {
  const eventConfig = [ {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'assign_schedule',
      params: ''
    } ]
  } ];

  sinon.stub(config, 'get').returns(eventConfig);
  try {
    transition.init();
    test.done(new Error('Expected validation error'));
  } catch(e) {
    test.ok(e instanceof Error);
    test.equals(e.message, 'Configuration error. Expecting params to be defined as the name of the schedule(s) for R.assign_schedule');
    test.done();
  }
};

exports['trigger param configuration fails with object parameters'] = test => {
  const eventConfig = [ {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'assign_schedule',
      params: '{ "name": "hello" }'
    } ]
  } ];

  sinon.stub(config, 'get').returns(eventConfig);
  try {
    transition.init();
    test.done(new Error('Expected validation error'));
  } catch(e) {
    test.ok(e instanceof Error);
    test.equals(e.message, 'Configuration error. Expecting params to be a string, comma separated list, or an array for R.assign_schedule: \'{ "name": "hello" }\'');
    test.done();
  }
};

exports['trigger param configuration succeeds with array parameters'] = test => {
  const eventConfig = [ {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'assign_schedule',
      params: 'a,b'
    } ]
  } ];

  sinon.stub(config, 'get').returns(eventConfig);
  transition.init();
  test.done();
};

exports['trigger param configuration parse failure for invalid JSON propagates to the callbacks'] = test => {
  const eventConfig = [ {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'testparamparsing',
      params: '{"foo": "bar"' // missing end "}"
    } ]
  } ];

  sinon.stub(config, 'get').returns(eventConfig);
  try {
    transition.init();
    test.done(new Error('Expected validation error'));
  } catch(e) {
    test.ok(e instanceof Error);
    test.equals(e.message, 'Configuration error. Unable to parse params for R.testparamparsing: \'{"foo": "bar"\'. Error: SyntaxError: Unexpected end of JSON input');
    test.done();
  }
};

exports['add_patient trigger fails when patient_id_field is set to patient_id'] = test => {
  const eventConfig = [ {
    form: 'R',
    events: [ {
      name: 'on_create',
      trigger: 'add_patient',
      params: '{ "patient_id_field": "patient_id" }'
    } ]
  } ];

  sinon.stub(config, 'get').returns(eventConfig);
  try {
    transition.init();
    test.done(new Error('Expected validation error'));
  } catch(e) {
    test.ok(e instanceof Error);
    test.equals(e.message, 'Configuration error. patient_id_field cannot be set to patient_id');
    test.done();
  }
};
