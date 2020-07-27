const sinon = require('sinon');
const assert = require('chai').assert;
const moment = require('moment');
const utils = require('../../src/lib/utils');
const db = require('../../src/db');
const schedule = require('../../src/schedule/due_tasks');
const date = require('../../src/date');

describe('due tasks', () => {
  afterEach(() => sinon.restore());

  it('due_tasks handles view returning no rows', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [],
    });
    const saveDoc = sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 0);
    });
  });

  it('set all due scheduled tasks to pending', () => {
    const due = moment();
    const due1 = moment().subtract(2, 'day');
    const due2 = moment().subtract(3, 'day');
    const notDue = moment().add(7, 'days');
    const id = 'xyz';

    const doc = {
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
    const view = sinon.stub(db.medic, 'query').resolves({
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

    const saveDoc = sinon.stub(db.medic, 'put').resolves({});
    const hydrate = sinon.stub(schedule._lineage, 'hydrateDocs').resolves([doc]);
    const setTaskState = sinon.stub(utils, 'setTaskState');

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      const saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 4);
      assert.equal(setTaskState.callCount, 3);

      assert(setTaskState.calledWithMatch({ due: due.toISOString(), state: 'scheduled' }, 'pending'));
      assert(setTaskState.calledWithMatch({ due: due1.toISOString(), state: 'scheduled' }, 'pending'));
      assert(setTaskState.calledWithMatch({ due: due2.toISOString(), state: 'scheduled' }, 'pending'));

      assert.equal(hydrate.callCount, 1);
      assert.deepEqual(hydrate.args[0][0], [doc]);
    });
  });

  it('set all due scheduled tasks to pending and handles repeated rows', () => {
    const due = moment();
    const notDue = moment().add(7, 'days');
    const id = 'xyz';
    const doc = {
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
    const hydrate = sinon.stub(schedule._lineage, 'hydrateDocs').resolves([doc]);
    const view = sinon.stub(db.medic, 'query').resolves({
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

    const saveDoc = sinon.stub(db.medic, 'put').resolves({});
    const setTaskState = sinon.stub(utils, 'setTaskState');

    return schedule.execute().then(() => {
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
      const saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 2);
    });
  });

  it('set all due scheduled tasks to pending and handles nonrepeated rows', () => {
    const due = moment();
    const id1 = 'xyz';
    const id2 = 'abc';
    const doc1 = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'x'
        },
      ],
    };
    const doc2 = {
      scheduled_tasks: [
        {
          due: due.toISOString(),
          state: 'scheduled',
          message: 'y'
        },
      ],
    };

    const view = sinon.stub(db.medic, 'query').resolves({
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
    sinon.stub(schedule._lineage, 'hydrateDocs')
      .onCall(0).resolves([doc1])
      .onCall(1).resolves([doc2]);
    const saveDoc = sinon.stub(db.medic, 'put').resolves({});

    const setTaskState = sinon.stub(utils, 'setTaskState');

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 2);
      assert.equal(setTaskState.callCount, 2);
      assert(
        setTaskState.alwaysCalledWithMatch({ due: due.toISOString(), state: 'scheduled' })
      );
    });
  });

  it('generates the messages for all due scheduled tasks', () => {
    const due = moment();
    const notDue = moment().add(7, 'days');
    const id = 'xyz';
    const patientUuid = '123-456-789';
    const expectedPhone = '5556918';
    const translate = sinon
      .stub(utils, 'translate')
      .returns('Please visit {{patient_name}} asap');
    const getRegistrations = sinon.stub(utils, 'getRegistrations').resolves([]);
    const getContactUuid = sinon.stub(utils, 'getContactUuid').resolves(patientUuid);
    const fetchHydratedDoc = sinon.stub(schedule._lineage, 'fetchHydratedDoc').resolves({ name: 'jim' });
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
    const view = sinon.stub(db.medic, 'query').resolves({
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
      .resolves([hydrated]);
    const saveDoc = sinon.stub(db.medic, 'put').resolves({});

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(translate.callCount, 1);
      assert.equal(translate.args[0][0], 'visit-1');
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getContactUuid.callCount, 1);
      assert.equal(getContactUuid.args[0][0], '123');
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
    });
  });

  it('does not generate messages if they are already generated', () => {
    const due = moment();
    const id = 'xyz';
    const patientUuid = '123-456-789';
    const expectedPhone = '5556918';
    const expectedMessage = 'old message';
    const getRegistrations = sinon.stub(utils, 'getRegistrations').resolves([]);
    const getContactUuid = sinon.stub(utils, 'getContactUuid').resolves(patientUuid);
    const fetchHydratedDoc = sinon.stub(schedule._lineage, 'fetchHydratedDoc').resolves({ name: 'jim' });
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
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: minified,
        },
      ],
    });
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    const saveDoc = sinon.stub(db.medic, 'put').resolves({});
    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(getContactUuid.callCount, 1);
      assert.equal(getContactUuid.args[0][0], '123');
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
    });
  });

  it('should not crash when registrations are found, but patient is not', () => {
    const due = moment();
    const phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').resolves([{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getContactUuid').resolves(null);
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

    sinon.stub(db.medic, 'query').resolves({ rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(db.medic.query.callCount, 1);
      assert.equal(db.medic.put.callCount, 0);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getContactUuid.callCount, 1);
      assert.equal(utils.getContactUuid.args[0][0], '123');
      assert.equal(schedule._lineage.fetchHydratedDoc.callCount, 0);
      assert.equal(utils.setTaskState.callCount, 0);
    });
  });

  it('should not update task state and not save messages when messages lib errors', () => {
    const due = moment();
    const phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').resolves([{ fields: { patient_id: '12345' } }]);
    sinon.stub(utils, 'getContactUuid').resolves(null);
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

    sinon.stub(db.medic, 'query').resolves({ rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves({});

    return schedule.execute().then(() => {
      assert.equal(db.medic.query.callCount, 1);
      assert.equal(db.medic.put.callCount, 1);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.getContactUuid.callCount, 1);
      assert.equal(utils.getContactUuid.args[0][0], '123');
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
    });
  });

  it('should query with a limit and correct start and end key', () => {
    const now = moment('2020-02-01 00:00:00');
    sinon.stub(date, 'getDate').returns(now);
    const view = sinon.stub(db.medic, 'query').resolves({ rows: [] });

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.deepEqual(view.args[0], [
        'medic/messages_by_state',
        {
          include_docs: true,
          endkey: [ 'scheduled', now.valueOf() ],
          startkey: [ 'scheduled', now.subtract(7, 'days').valueOf() ],
          limit: 1000,
        }
      ]);
    });
  });
});
