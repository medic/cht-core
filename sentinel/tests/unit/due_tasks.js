const sinon = require('sinon'),
  assert = require('chai').assert,
  moment = require('moment'),
  utils = require('../../src/lib/utils'),
  dbPouch = require('../../src/db-pouch'),
  schedule = require('../../src/schedule/due_tasks');

describe('due tasks', () => {
  afterEach(() => sinon.restore());

  it('due_tasks handles view returning no rows', done => {
    var db = {
      view: function() {},
    };

    var view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [],
    });
    var saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null);

    schedule.execute({ medic: db }, function(err) {
      assert.equal(err, undefined);
      done();
    });

    assert.equal(view.callCount, 1);
    assert.equal(saveDoc.callCount, 0);
  });

  it('set all due scheduled tasks to pending', done => {
    var due = moment().toISOString();
    var notDue = moment()
      .add(7, 'days')
      .toISOString();
    var id = 'xyz';

    var db = {
      view: function() {},
    };
    var doc = {
      scheduled_tasks: [
        {
          due: due,
          state: 'scheduled',
        },
        {
          due: notDue,
          state: 'scheduled',
        },
      ],
    };
    var view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [
        {
          id: id,
          key: due,
          doc: doc,
        },
      ],
    });

    var saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});
    var hydrate = sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([doc]));
    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute({ medic: db }, function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      var saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 2);
      assert.equal(setTaskState.callCount, 1);
      assert(
        setTaskState.calledWithMatch(
          { due: due, state: 'scheduled' },
          'pending'
        )
      );

      assert.equal(hydrate.callCount, 1);
      assert.deepEqual(hydrate.args[0][0], [doc]);
      done();
    });
  });

  it('set all due scheduled tasks to pending and handles repeated rows', done => {
    var due = moment().toISOString();
    var notDue = moment()
      .add(7, 'days')
      .toISOString();
    var id = 'xyz';
    var doc = {
      scheduled_tasks: [
        {
          due: due,
          state: 'scheduled',
        },
        {
          due: notDue,
          state: 'scheduled',
        },
      ],
    };
    var hydrate = sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([doc]));
    var db = {
      view: function() {},
    };
    var view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [
        {
          id: id,
          key: due,
          doc: doc,
        },
        {
          id: id,
          key: due,
          doc: doc,
        },
      ],
    });

    var saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});
    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute({ medic: db }, function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(hydrate.callCount, 1);
      assert.equal(setTaskState.callCount, 1);
      assert(
        setTaskState.calledWithMatch(
          { due: due, state: 'scheduled' },
          'pending'
        )
      );
      var saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 2);
      done();
    });
  });

  it('set all due scheduled tasks to pending and handles nonrepeated rows', done => {
    var due = moment().toISOString();
    var id1 = 'xyz';
    var id2 = 'abc';
    var doc1 = {
      scheduled_tasks: [
        {
          due: due,
          state: 'scheduled',
        },
      ],
    };
    var doc2 = {
      scheduled_tasks: [
        {
          due: due,
          state: 'scheduled',
        },
      ],
    };

    var db = {
      view: function() {},
    };
    var view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [
        {
          id: id1,
          key: due,
          doc: doc1,
        },
        {
          id: id2,
          key: due,
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
    var saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});

    var setTaskState = sinon.stub(utils, 'setTaskState');

    schedule.execute({ medic: db }, function(err) {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 2);
      assert.equal(setTaskState.callCount, 2);
      assert(
        setTaskState.alwaysCalledWithMatch({ due: due, state: 'scheduled' })
      );
      done();
    });
  });

  it('generates the messages for all due scheduled tasks', done => {
    const due = moment().toISOString();
    const notDue = moment()
      .add(7, 'days')
      .toISOString();
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
      .callsArgWith(2, null, patientUuid);
    const fetchHydratedDoc = sinon
      .stub(schedule._lineage, 'fetchHydratedDoc')
      .callsArgWith(1, null, { name: 'jim' });
    const setTaskState = sinon.stub(utils, 'setTaskState');

    const db = {
      view: () => {},
    };
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
          due: due,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: notDue,
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
          due: due,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: notDue,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
      ],
    };
    const view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [
        {
          id: id,
          key: due,
          doc: minified,
        },
      ],
    });
    sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([hydrated]));
    const saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});

    schedule.execute({ medic: db }, err => {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(translate.callCount, 1);
      assert.equal(translate.args[0][0], 'visit-1');
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getPatientContactUuid.callCount, 1);
      assert.equal(getPatientContactUuid.args[0][1], '123');
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
    const due = moment().toISOString();
    const id = 'xyz';
    const patientUuid = '123-456-789';
    const expectedPhone = '5556918';
    const expectedMessage = 'old message';
    const getRegistrations = sinon
      .stub(utils, 'getRegistrations')
      .callsArgWith(1, null, []);
    const getPatientContactUuid = sinon
      .stub(utils, 'getPatientContactUuid')
      .callsArgWith(2, null, patientUuid);
    const fetchHydratedDoc = sinon
      .stub(schedule._lineage, 'fetchHydratedDoc')
      .callsArgWith(1, null, { name: 'jim' });
    const setTaskState = sinon.stub(utils, 'setTaskState');

    const db = {
      view: () => {},
    };
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
          due: due,
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
          due: due,
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
    const view = sinon.stub(db, 'view').callsArgWith(3, null, {
      rows: [
        {
          id: id,
          key: due,
          doc: minified,
        },
      ],
    });
    sinon
      .stub(schedule._lineage, 'hydrateDocs')
      .returns(Promise.resolve([hydrated]));
    const saveDoc = sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});
    schedule.execute({ medic: db }, err => {
      assert.equal(err, undefined);
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getPatientContactUuid.callCount, 1);
      assert.equal(getPatientContactUuid.args[0][1], '123');
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
    const due = moment().toISOString(),
          db = { view: sinon.stub() },
          phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null);
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
          due: due,
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
          due: due,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        }
      ],
    };

    db.view.callsArgWith(3, null, { rows: [ { id: 'report_id', key: due, doc: minified }]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(dbPouch.medic, 'put');

    schedule.execute({ medic: db }, err => {
      assert.equal(err, undefined);
      assert.equal(db.view.callCount, 1);
      assert.equal(dbPouch.medic.put.callCount, 0);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getPatientContactUuid.callCount, 1);
      assert.equal(utils.getPatientContactUuid.args[0][1], '123');
      assert.equal(schedule._lineage.fetchHydratedDoc.callCount, 0);
      assert.equal(utils.setTaskState.callCount, 0);
      done();
    });
  });

  it('should not update task state and not save messages when messages lib errors', done => {
    const due = moment().toISOString(),
          db = { view: sinon.stub() },
          phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null);
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
          due: due,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: due,
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
          due: due,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: due,
          state: 'scheduled',
          messages: [{ message: 'visit-ad', to: phone }]
        }
      ],
    };

    db.view.callsArgWith(3, null, { rows: [ { id: 'report_id', key: due, doc: minified }]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(dbPouch.medic, 'put').callsArgWith(1, null, {});

    schedule.execute({ medic: db }, err => {
      assert.equal(err, undefined);
      assert.equal(db.view.callCount, 1);
      assert.equal(dbPouch.medic.put.callCount, 1);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getPatientContactUuid.callCount, 1);
      assert.equal(utils.getPatientContactUuid.args[0][1], '123');
      assert.equal(schedule._lineage.fetchHydratedDoc.callCount, 0);
      assert.equal(utils.setTaskState.callCount, 1);
      assert.deepEqual(utils.setTaskState.args[0], [
        {
          due: due,
          state: 'pending',
          messages: [{ message: 'visit-ad', to: phone}]
        },
        'pending'
      ]);
      assert.equal(dbPouch.medic.put.callCount, 1);
      assert.equal(dbPouch.medic.put.args[0][0].scheduled_tasks.length, 2);
      assert.deepEqual(dbPouch.medic.put.args[0][0].scheduled_tasks[0], {
        due: due,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic',
      });

      assert.deepEqual(dbPouch.medic.put.args[0][0].scheduled_tasks[1], {
        due: due,
        state: 'pending',
        messages: [{ message: 'visit-ad', to: phone}]
      });

      done();
    });
  });
});
