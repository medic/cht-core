const sinon = require('sinon'),
  assert = require('chai').assert,
  moment = require('moment'),
  utils = require('../../src/lib/utils'),
  db = require('../../src/db'),
  schedule = require('../../src/schedule/due_tasks');

describe('due tasks', () => {
  afterEach(() => sinon.restore());

  it('due_tasks handles view returning no rows', done => {
    var view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [],
    });
    var saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null);

    schedule.execute(function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 0);
      done();
    });
  });

  it('set all due scheduled tasks to pending', done => {
    const due = moment(),
          due1 = moment().subtract(2, 'day'),
          due2 = moment().subtract(3, 'day'),
          notDue = moment().add(7, 'days');
    var id = 'xyz';

    var doc = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'x'
        },
        {
          due: notDue.toISOString(),
          state: 'scheduled',
          message: 'y'
        },
        {
          due: due1.toISOString(),
          state: 'scheduled',
          message: 'z'
        },
        {
          due: due2.toISOString(),
          state: 'scheduled',
          message: 't'
        },
      ],
    };
    var view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: doc,
        },
        {
          id: id,
          key: [ 'scheduled', due1.valueOf() ],
          doc: doc,
        },
        {
          id: id,
          key: [ 'scheduled', due2.valueOf() ],
          doc: doc,
        }
      ],
    });

    var saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, {});
    var hydrate = sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([doc]));
    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute(function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      var saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 4);
      assert.equal(setTaskState.callCount, 3);

      assert(setTaskState.calledWithMatch({ due: due.toISOString(), state: 'scheduled' }, 'pending'));
      assert(setTaskState.calledWithMatch({ due: due1.toISOString(), state: 'scheduled' }, 'pending'));
      assert(setTaskState.calledWithMatch({ due: due2.toISOString(), state: 'scheduled' }, 'pending'));

      assert.equal(hydrate.callCount, 1);
      assert.deepEqual(hydrate.args[0][0], [doc]);
      done();
    });
  });

  it('set all due scheduled tasks to pending and handles repeated rows', done => {
    var due = moment();
    var notDue = moment().add(7, 'days');
    var id = 'xyz';
    var doc = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'x'
        },
        {
          due: notDue.toISOString(),
          state: 'scheduled',
          message: 'y'
        },
      ],
    };
    var hydrate = sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([doc]));
    var view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: doc,
        },
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: doc,
        },
      ],
    });

    var saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, {});
    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute(function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(hydrate.callCount, 1);
      assert.equal(setTaskState.callCount, 1);
      assert(
        setTaskState.calledWithMatch(
          { due: due.toISOString(), state: 'scheduled' },
          'pending'
        )
      );
      var saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 2);
      done();
    });
  });

  it('set all due scheduled tasks to pending and handles nonrepeated rows', done => {
    var due = moment();
    var id1 = 'xyz';
    var id2 = 'abc';
    var doc1 = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'x'
        },
      ],
    };
    var doc2 = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'y'
        },
      ],
    };

    var view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          id: id1,
          key: [ 'scheduled', due.valueOf() ],
          doc: doc1,
        },
        {
          id: id2,
          key: [ 'scheduled', due.valueOf() ],
          doc: doc2,
        },
      ],
    });
    sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .onCall(0)
      .returns(Promise.resolve([doc1]))
      .onCall(1)
      .returns(Promise.resolve([doc2]));
    var saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, {});

    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute(function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 2);
      assert.equal(setTaskState.callCount, 2);
      assert(
        setTaskState.alwaysCalledWithMatch({ due: due.toISOString(), state: 'scheduled' })
      );
      done();
    });
  });

  it('generates the messages for all due scheduled tasks', done => {
    const due = moment();
    const notDue = moment().add(7, 'days');
    const id = 'xyz';
    const patientUuid = '123-456-789';
    const expectedPhone = '5556918';
    const translate = sinon
      .stub(utils, 'translate')
      .returns('Please visit {{patient_name}} asap');
    const getRegistrations = sinon
      .stub(utils, 'getRegistrations')
      .callsArgWith(1, null, []);
    const getPatientContactUuid = sinon
      .stub(utils, 'getPatientContactUuid')
      .callsArgWith(1, null, patientUuid);
    const fetchHydratedDoc = sinon
      .stub(schedule._lineage, 'fetchHydratedDoc')
      .callsArgWith(1, null, { name: 'jim' });
    const setTaskState = sinon.stub(utils, 'setTaskState');

    const minified = {
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        parent: {
          _id: 'b',
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: notDue.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
      ],
    };
    const hydrated = {
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        type: 'person',
        parent: {
          _id: 'b',
          type: 'clinic',
          contact: {
            _id: 'c',
            type: 'person',
            phone: expectedPhone,
          },
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: notDue.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
      ],
    };
    const view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: minified,
        },
      ],
    });
    sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([hydrated]));
    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, {});

    schedule.execute(err => {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(translate.callCount, 1);
      assert.equal(translate.args[0][0], 'visit-1');
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getPatientContactUuid.callCount, 1);
      assert.equal(getPatientContactUuid.args[0][0], '123');
      assert.equal(fetchHydratedDoc.callCount, 1);
      assert.equal(fetchHydratedDoc.args[0][0], patientUuid);
      assert.equal(setTaskState.callCount, 1);
      const saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 2);
      assert.equal(saved.scheduled_tasks[0].messages.length, 1);
      assert.equal(saved.scheduled_tasks[0].messages[0].to, expectedPhone);
      assert.equal(
        saved.scheduled_tasks[0].messages[0].message,
        'Please visit jim asap'
      );
      assert.equal(saved.scheduled_tasks[1].messages, undefined);
      done();
    });
  });

  it('does not generate messages if they are already generated', done => {
    const due = moment();
    const id = 'xyz';
    const patientUuid = '123-456-789';
    const expectedPhone = '5556918';
    const expectedMessage = 'old message';
    const getRegistrations = sinon
      .stub(utils, 'getRegistrations')
      .callsArgWith(1, null, []);
    const getPatientContactUuid = sinon
      .stub(utils, 'getPatientContactUuid')
      .callsArgWith(1, null, patientUuid);
    const fetchHydratedDoc = sinon
      .stub(schedule._lineage, 'fetchHydratedDoc')
      .callsArgWith(1, null, { name: 'jim' });
    const setTaskState = sinon.stub(utils, 'setTaskState');

    const minified = {
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        parent: {
          _id: 'b',
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
          messages: [
            {
              to: expectedPhone,
              message: expectedMessage,
            },
          ],
        },
      ],
    };
    const hydrated = {
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        type: 'person',
        parent: {
          _id: 'b',
          type: 'clinic',
          contact: {
            _id: 'c',
            type: 'person',
            phone: 'unexpectedphone',
          },
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
          messages: [
            {
              to: expectedPhone,
              message: expectedMessage,
            },
          ],
        },
      ],
    };
    const view = sinon.stub(db.medic, 'query').callsArgWith(2, null, {
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: minified,
        },
      ],
    });
    sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([hydrated]));
    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, {});
    schedule.execute(err => {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getPatientContactUuid.callCount, 1);
      assert.equal(getPatientContactUuid.args[0][0], '123');
      assert.equal(fetchHydratedDoc.callCount, 1);
      assert.equal(fetchHydratedDoc.args[0][0], patientUuid);
      assert.equal(setTaskState.callCount, 1);
      const saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 1);
      assert.equal(saved.scheduled_tasks[0].messages.length, 1);
      assert.equal(saved.scheduled_tasks[0].messages[0].to, expectedPhone);
      assert.equal(
        saved.scheduled_tasks[0].messages[0].message,
        expectedMessage
      );
      done();
    });
  });

  it('should not crash when registrations are found, but patient is not', done => {
    const due = moment(),
          phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null);
    sinon.stub(schedule._lineage, 'fetchHydratedDoc');
    sinon.stub(utils, 'setTaskState');

    const minified = {
      _id: 'report_id',
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        parent: {
          _id: 'b',
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        }
      ],
    };
    const hydrated = {
      _id: 'report_id',
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        type: 'person',
        parent: {
          _id: 'b',
          type: 'clinic',
          contact: {
            _id: 'c',
            type: 'person',
            phone: phone,
          },
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        }
      ],
    };

    sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put');

    schedule.execute(err => {
      assert.equal(err, undefined);
      assert.equal(db.medic.query.callCount, 1);
      assert.equal(db.medic.put.callCount, 0);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getPatientContactUuid.callCount, 1);
      assert.equal(utils.getPatientContactUuid.args[0][0], '123');
      assert.equal(schedule._lineage.fetchHydratedDoc.callCount, 0);
      assert.equal(utils.setTaskState.callCount, 0);
      done();
    });
  });

  it('should not update task state and not save messages when messages lib errors', done => {
    const due = moment(),
          phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null);
    sinon.stub(schedule._lineage, 'fetchHydratedDoc');
    sinon.stub(utils, 'setTaskState').callsFake((task, state) => task.state = state);

    const minified = {
      _id: 'report_id',
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        parent: {
          _id: 'b',
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: due.toISOString(),
          state: 'scheduled',
          messages: [{ message: 'visit-ad', to: phone }]
        }
      ],
    };
    const hydrated = {
      _id: 'report_id',
      fields: {
        patient_id: '123',
      },
      contact: {
        _id: 'a',
        type: 'person',
        parent: {
          _id: 'b',
          type: 'clinic',
          contact: {
            _id: 'c',
            type: 'person',
            phone: phone,
          },
        },
      },
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: due.toISOString(),
          state: 'scheduled',
          messages: [{ message: 'visit-ad', to: phone }]
        }
      ],
    };

    sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').callsArgWith(1, null, {});

    schedule.execute(err => {
      assert.equal(err, undefined);
      assert.equal(db.medic.query.callCount, 1);
      assert.equal(db.medic.put.callCount, 1);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getPatientContactUuid.callCount, 1);
      assert.equal(utils.getPatientContactUuid.args[0][0], '123');
      assert.equal(schedule._lineage.fetchHydratedDoc.callCount, 0);
      assert.equal(utils.setTaskState.callCount, 1);
      assert.deepEqual(utils.setTaskState.args[0], [
        {
          due: due.toISOString(),
          state: 'pending',
          messages: [{ message: 'visit-ad', to: phone }]
        },
        'pending'
      ]);
      assert.equal(db.medic.put.callCount, 1);
      assert.equal(db.medic.put.args[0][0].scheduled_tasks.length, 2);
      assert.deepEqual(db.medic.put.args[0][0].scheduled_tasks[0], {
        due: due.toISOString(),
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic',
      });

      assert.deepEqual(db.medic.put.args[0][0].scheduled_tasks[1], {
        due: due.toISOString(),
        state: 'pending',
        messages: [{ message: 'visit-ad', to: phone}]
      });

      done();
    });
  });
});
