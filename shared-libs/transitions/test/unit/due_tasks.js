const sinon = require('sinon');
const assert = require('chai').assert;
const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const moment = require('moment');
const utils = require('../../src/lib/utils');
const db = require('../../src/db');
const rpn = require('request-promise-native');
const config = require('../../src/config');

describe('due tasks', () => {
  let schedule;
  let date;

  beforeEach(() => {
    config.init({
      getAll: sinon
        .stub()
        .returns({}),
    });

    schedule = require('../../src/schedule/due_tasks');
    date = require('../../src/date');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('due_tasks handles view returning no rows', () => {
    const view = sinon.stub(rpn, 'get')
      .resolves({
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
    const view = sinon.stub(rpn, 'get').resolves({
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
    const view = sinon.stub(rpn, 'get').resolves({
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

    const view = sinon.stub(rpn, 'get')
      .onCall(0).resolves({
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
      })
      .onCall(1).resolves({ rows: [] });
    sinon.stub(schedule._lineage, 'hydrateDocs')
      .onCall(0).resolves([doc1])
      .onCall(1).resolves([doc2]);
    const saveDoc = sinon.stub(db.medic, 'put').resolves({});

    const setTaskState = sinon.stub(utils, 'setTaskState');

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 2);
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
    const expectedPhone = '5556918';
    const translate = sinon
      .stub(utils, 'translate')
      .returns('Please visit {{patient_name}} asap');
    const getRegistrations = sinon.stub(utils, 'getRegistrations').resolves([]);
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
      patient: {
        _id: 'patient',
        patient_id: '123',
        name: 'jim',
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
    const view = sinon.stub(rpn, 'get').resolves({
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
    const expectedPhone = '5556918';
    const expectedMessage = 'old message';
    const getRegistrations = sinon.stub(utils, 'getRegistrations').resolves([]);
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
      patient: {
        _id: '123-456-789',
        patient_id: '123',
        name: 'jim',
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
    const view = sinon.stub(rpn, 'get').resolves({
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

    sinon.stub(rpn, 'get').resolves({ rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 1);
      assert.equal(db.medic.put.callCount, 0);
      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.equal(utils.setTaskState.callCount, 0);
    });
  });

  it('should generate messages correctly for patient subjects', () => {
    const due = moment();
    const phone = '123456789';

    sinon.stub(utils, 'translate').returns('Place {{place.name}} {{place.place_id}} {{fld}} must be visited');
    sinon.stub(utils, 'getRegistrations').resolves([{ fields: { place_id: '999999', fld: 'lalala' } }]);
    sinon.stub(utils, 'setTaskState');

    const minified = {
      _id: 'report_id',
      type: 'data_record',
      fields: {
        place_id: '999999',
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
      type: 'data_record',
      fields: {
        place_id: '999999',
      },
      place: {
        _id: 'place_uuid',
        place_id: '999999',
        name: 'joes place',
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

    sinon.stub(rpn, 'get').resolves({ rows: [{ id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 1);
      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
      assert.deepEqual(utils.getRegistrations.args[0], [{ id: '999999' }]);
      assert.equal(utils.setTaskState.callCount, 1);
      assert.equal(db.medic.put.callCount, 1);
      assert.deepEqualExcludingEvery(db.medic.put.args[0], [
        {
          _id: 'report_id',
          type: 'data_record',
          fields: {
            place_id: '999999',
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
              messages: [{
                message: 'Place joes place 999999 lalala must be visited',
                to: phone,

              }]
            }
          ],
        }
      ], ['uuid']);
    });
  });

  it('should pass place registrations to message-utils when both place and patient are present', () => {
    const due = moment();
    const phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}}, living in {{place.name}} {{fld}} asap');
    sinon.stub(utils, 'getRegistrations')
      .onCall(0).resolves([{ fields: { patient_id: '12345' } }])
      .onCall(1).resolves([{ fields: { place_id: '999999', fld: 'lalala' } }]);
    sinon.stub(utils, 'setTaskState');

    const minified = {
      _id: 'report_id',
      type: 'data_record',
      fields: {
        patient_id: '12345',
        place_id: '999999',
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
      type: 'data_record',
      fields: {
        patient_id: '12345',
        place_id: '999999',
      },
      patient: {
        _id: 'patient_uuid',
        patient_id: '12345',
        name: 'joe',
      },
      place: {
        _id: 'place_uuid',
        place_id: '999999',
        name: 'joes place',
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

    sinon.stub(rpn, 'get').resolves({ rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified },
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 1);
      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 2);
      assert.deepEqual(utils.getRegistrations.args, [ [{ id: '12345' }], [{ id: '999999' }] ]);
      assert.equal(utils.setTaskState.callCount, 1);
      assert.equal(db.medic.put.callCount, 1);
      assert.deepEqualExcludingEvery(db.medic.put.args[0], [
        {
          _id: 'report_id',
          type: 'data_record',
          fields: {
            patient_id: '12345',
            place_id: '999999',
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
              messages: [{
                message: 'Please visit joe, living in joes place lalala asap',
                to: phone,

              }]
            }
          ],
        }
      ], ['uuid']);
    });
  });

  it('should not update task state and not save messages when messages lib errors', () => {
    const due = moment();
    const phone = '123456789';

    sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    sinon.stub(utils, 'getRegistrations').resolves([{ fields: { patient_id: '12345' } }]);
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

    sinon.stub(rpn, 'get').resolves({ rows: [
      { id: 'report_id', key: [ 'scheduled', due.valueOf() ], doc: minified }
    ]});
    sinon.stub(schedule._lineage, 'hydrateDocs').resolves([hydrated]);
    sinon.stub(db.medic, 'put').resolves({});

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 1);
      assert.equal(db.medic.put.callCount, 1);

      assert.equal(utils.translate.callCount, 1);
      assert.equal(utils.translate.args[0][0], 'visit-1');
      assert.equal(utils.getRegistrations.callCount, 1);
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

  it('should match due date correctly', () => {
    const due = moment();
    const notDue = moment().add(7, 'days');
    const id = 'xyz';
    const expectedPhone = '5556918';
    const translate = sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
    const getRegistrations = sinon.stub(utils, 'getRegistrations').resolves([]);
    const setTaskState = sinon.spy(utils, 'setTaskState');

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
          due: null,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: null,
          timestamp: due.valueOf(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: null,
          timestamp: notDue.valueOf(),
          state: 'scheduled',
          message_key: 'visit-2',
          recipient: 'clinic',
        },
      ],
      reported_date: due.valueOf(),
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
      patient: {
        _id: '123-456-789',
        patient_id: '123',
        name: 'jim',
      },
      scheduled_tasks: [
        {
          due: null,
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: null,
          timestamp: due.valueOf(),
          state: 'scheduled',
          message_key: 'visit-1',
          recipient: 'clinic',
        },
        {
          due: null,
          timestamp: notDue.valueOf(),
          state: 'scheduled',
          message_key: 'visit-2',
          recipient: 'clinic',
        },
      ],
      reported_date: due.valueOf(),
    };
    const view = sinon.stub(rpn, 'get').resolves({
      rows: [
        {
          id: id,
          key: [ 'scheduled', due.valueOf() ],
          doc: minified,
        },
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
      assert.equal(translate.callCount, 2);
      assert.equal(translate.args[0][0], 'visit-1');
      assert.equal(translate.args[1][0], 'visit-1');
      assert.equal(getRegistrations.callCount, 1);
      assert.equal(setTaskState.callCount, 2);
      const saved = saveDoc.firstCall.args[0];
      assert.equal(saved.scheduled_tasks.length, 3);
      assert.equal(saved.scheduled_tasks[0].messages.length, 1);
      assert.deepInclude(saved.scheduled_tasks[0].messages[0], {
        to: expectedPhone,
        message: 'Please visit jim asap'
      });
      assert.equal(saved.scheduled_tasks[0].state, 'pending');
      assert.deepInclude(saved.scheduled_tasks[1].messages[0], {
        to: expectedPhone,
        message: 'Please visit jim asap'
      });
      assert.equal(saved.scheduled_tasks[1].state, 'pending');

      assert.equal(saved.scheduled_tasks[2].messages, undefined);
      assert.equal(saved.scheduled_tasks[2].state, 'scheduled');
    });
  });

  it('should query with a limit and correct start and end key', () => {
    const now = moment('2020-02-01 00:00:00');
    sinon.stub(date, 'getDate').returns(now);
    sinon.stub(db, 'couchUrl').value('http://admin:pass@127.0.0.1:5984/medic');
    const view = sinon.stub(rpn, 'get').resolves({ rows: [] });

    return schedule.execute().then(() => {
      assert.equal(view.callCount, 1);
      assert.deepEqual(view.args[0], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify([ 'scheduled', now.subtract(7, 'days').valueOf() ]),
          limit: 1000,
        },
        json: true
      }]);
    });
  });

  it('should keep querying until no more results', () => {
    const now = moment('2020-02-01 00:00:00');
    sinon.stub(date, 'getDate').returns(now);
    sinon.stub(db, 'couchUrl').value('http://admin:pass@127.0.0.1:5984/medic');
    sinon.stub(db.medic, 'put').resolves({});

    const firstResults = [
      {
        id: 'doc1',
        key: ['scheduled', moment('2020-01-25').valueOf()],
        doc: {
          _id: 'doc1',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: moment('2020-01-25').toISOString(),
            state: 'scheduled',
            message_key: 'visit-1',
            recipient: 'clinic',
          }]
        }
      },
      {
        id: 'doc2',
        key: ['scheduled', moment('2020-01-26').valueOf()],
        doc: {
          _id: 'doc2',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            state: 'scheduled',
            message_key: 'visit-2',
            recipient: 'clinic',
          }],
          reported_date: moment('2020-01-26').valueOf(),
        }
      },
      {
        id: 'doc3',
        key: ['scheduled', moment('2020-01-27').valueOf()],
        doc: {
          _id: 'doc3',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-27').valueOf(),
            state: 'scheduled',
            message_key: 'visit-2',
            recipient: 'clinic',
          }],
        }
      },
    ];

    const secondResults = [
      {
        id: 'doc4',
        key: ['scheduled', moment('2020-01-28').valueOf()],
        doc: {
          _id: 'doc4',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: moment('2020-01-28').toISOString(),
            state: 'scheduled',
            message_key: 'visit-4',
            recipient: 'clinic',
          }]
        }
      },
      {
        id: 'doc5',
        key: ['scheduled', moment('2020-01-29').valueOf()],
        doc: {
          _id: 'doc5',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            state: 'scheduled',
            message_key: 'visit-5',
            recipient: 'clinic',
          }],
          reported_date: moment('2020-01-29').valueOf(),
        }
      },
      {
        id: 'doc6',
        key: ['scheduled', moment('2020-01-30').valueOf()],
        doc: {
          _id: 'doc6',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-30').toISOString(),
            state: 'scheduled',
            message_key: 'visit-6',
            recipient: 'clinic',
          }],
        }
      },
    ];

    sinon
      .stub(rpn, 'get')
      .onCall(0).resolves({ rows: firstResults })
      .onCall(1).resolves({ rows: secondResults })
      .onCall(2).resolves({ rows: [] });

    const expectedPhone = '+40788636363';

    sinon.stub(schedule._lineage, 'hydrateDocs').callsFake(([ doc ]) => {
      doc.contact = {
        _id: 'contact',
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
      };
      return [doc];
    });

    sinon.stub(utils, 'translate').returns('Message for doc {{_id}}');

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 3);
      assert.deepEqual(rpn.get.args[0], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify([ 'scheduled', now.clone().subtract(7, 'days').valueOf() ]),
          limit: 1000,
        },
        json: true
      }]);
      assert.deepEqual(rpn.get.args[1], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify([ 'scheduled', moment('2020-01-27').valueOf() ]),
          startkey_docid: 'doc3',
          limit: 1000,
        },
        json: true
      }]);
      assert.deepEqual(rpn.get.args[2], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify(['scheduled', moment('2020-01-30').valueOf()]),
          startkey_docid: 'doc6',
          limit: 1000,
        },
        json: true
      }]);

      assert.equal(db.medic.put.callCount, 6);
      assert.deepNestedInclude(db.medic.put.args[0][0], {
        _id: 'doc1',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc1',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
      assert.deepNestedInclude(db.medic.put.args[1][0], {
        _id: 'doc2',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc2',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
      assert.deepNestedInclude(db.medic.put.args[2][0], {
        _id: 'doc3',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc3',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
      assert.deepNestedInclude(db.medic.put.args[3][0], {
        _id: 'doc4',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc4',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
      assert.deepNestedInclude(db.medic.put.args[4][0], {
        _id: 'doc5',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc5',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
      assert.deepNestedInclude(db.medic.put.args[5][0], {
        _id: 'doc6',
        contact: { _id: 'contact', parent: { _id: 'b' } },
        'scheduled_tasks[0].state': 'pending',
        'scheduled_tasks[0].messages[0].message': 'Message for doc doc6',
        'scheduled_tasks[0].messages[0].to': expectedPhone,
      });
    });
  });

  it('should keep querying until same result', () => {
    const now = moment('2020-02-01 00:00:00');
    sinon.stub(date, 'getDate').returns(now);
    sinon.stub(db, 'couchUrl').value('http://admin:pass@127.0.0.1:5984/medic');
    sinon.stub(db.medic, 'put').resolves({});

    const firstResults = [
      {
        id: 'doc1',
        key: ['scheduled', moment('2020-01-25').valueOf()],
        doc: {
          _id: 'doc1',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: moment('2020-01-25').toISOString(),
            state: 'scheduled',
            message_key: 'visit-1',
            recipient: 'clinic',
          }]
        }
      },
      {
        id: 'doc2',
        key: ['scheduled', moment('2020-01-26').valueOf()],
        doc: {
          _id: 'doc2',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            state: 'scheduled',
            message_key: 'visit-2',
            recipient: 'clinic',
          }],
          reported_date: moment('2020-01-26').valueOf(),
        }
      },
      {
        id: 'doc3',
        key: ['scheduled', moment('2020-01-27').valueOf()],
        doc: {
          _id: 'doc3',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-27').valueOf(),
            state: 'scheduled',
            message_key: 'visit-2',
            recipient: 'clinic',
          }],
        }
      },
    ];

    const secondResults = [
      {
        id: 'doc3',
        key: ['scheduled', moment('2020-01-27').valueOf()],
        doc: {
          _id: 'doc3',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-27').valueOf(),
            state: 'scheduled',
            message_key: 'visit-2',
            recipient: 'clinic',
          }],
        }
      },
      {
        id: 'doc4',
        key: ['scheduled', moment('2020-01-28').valueOf()],
        doc: {
          _id: 'doc4',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: moment('2020-01-28').toISOString(),
            state: 'scheduled',
            message_key: 'visit-4',
            recipient: 'clinic',
          }]
        }
      },
      {
        id: 'doc5',
        key: ['scheduled', moment('2020-01-29').valueOf()],
        doc: {
          _id: 'doc5',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            state: 'scheduled',
            message_key: 'visit-5',
            recipient: 'clinic',
          }],
          reported_date: moment('2020-01-29').valueOf(),
        }
      },
      {
        id: 'doc6',
        key: ['scheduled', moment('2020-01-30').valueOf()],
        doc: {
          _id: 'doc6',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-30').toISOString(),
            state: 'scheduled',
            message_key: 'visit-6',
            recipient: 'clinic',
          }],
        }
      },
    ];

    sinon
      .stub(rpn, 'get')
      .onCall(0).resolves({ rows: firstResults })
      .onCall(1).resolves({ rows: secondResults })
      .onCall(2).resolves({ rows: [{
        id: 'doc6',
        key: ['scheduled', moment('2020-01-30').valueOf()],
        doc: {
          _id: 'doc6',
          contact: { _id: 'contact' },
          scheduled_tasks: [{
            due: null,
            timestamp: moment('2020-01-30').toISOString(),
            state: 'scheduled',
            message_key: 'visit-6',
            recipient: 'clinic',
          }],
        }
      }] });

    const expectedPhone = '+40788636363';

    sinon.stub(schedule._lineage, 'hydrateDocs').callsFake(([ doc ]) => {
      doc.contact = {
        _id: 'contact',
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
      };
      return [doc];
    });

    // all messages will be errored!
    sinon.stub(utils, 'translate').returns(false);

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 3);
      assert.deepEqual(rpn.get.args[0], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify([ 'scheduled', now.clone().subtract(7, 'days').valueOf() ]),
          limit: 1000,
        },
        json: true
      }]);
      assert.deepEqual(rpn.get.args[1], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify([ 'scheduled', moment('2020-01-27').valueOf() ]),
          startkey_docid: 'doc3',
          limit: 1000,
        },
        json: true
      }]);
      assert.deepEqual(rpn.get.args[2], [{
        baseUrl: 'http://admin:pass@127.0.0.1:5984/medic',
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
          startkey: JSON.stringify(['scheduled', moment('2020-01-30').valueOf()]),
          startkey_docid: 'doc6',
          limit: 1000,
        },
        json: true
      }]);

      assert.equal(db.medic.put.callCount, 0);

      assert.equal(schedule._lineage.hydrateDocs.callCount, 8);

      assert.equal(schedule._lineage.hydrateDocs.args[0][0][0]._id, 'doc1');
      assert.equal(schedule._lineage.hydrateDocs.args[1][0][0]._id, 'doc2');
      assert.equal(schedule._lineage.hydrateDocs.args[2][0][0]._id, 'doc3');
      assert.equal(schedule._lineage.hydrateDocs.args[3][0][0]._id, 'doc3');
      assert.equal(schedule._lineage.hydrateDocs.args[4][0][0]._id, 'doc4');
      assert.equal(schedule._lineage.hydrateDocs.args[5][0][0]._id, 'doc5');
      assert.equal(schedule._lineage.hydrateDocs.args[6][0][0]._id, 'doc6');
      assert.equal(schedule._lineage.hydrateDocs.args[7][0][0]._id, 'doc6');
    });
  });

  it('should work when the queue is saturated by a single doc that has valid different records', () => {
    const now = moment().valueOf();
    sinon.stub(date, 'getDate').returns(moment(now));
    const scheduledTask = (idx) => ({
      due: now - (5000 + idx),
      state: 'scheduled',
      message_key: 'the_message',
      recipient: 'clinic',
    });

    const minifiedDoc = {
      _id: 'doc',
      contact: { _id: 'contact' },
      reported_date: moment().valueOf(),
      scheduled_tasks: Array.from({ length: 2500 }).map((e, i) => scheduledTask(i)),
    };

    const firstResponseRows = Array.from({ length: 1000 }).map((e, i) => ({
      id: 'doc',
      key: ['scheduled', minifiedDoc.scheduled_tasks[i].due],
      doc: minifiedDoc
    }));

    const secondResponseRows = Array.from({ length: 1500 }).map((e, i) => ({
      id: 'doc',
      key: ['scheduled', minifiedDoc.scheduled_tasks[1000 + i].due],
      doc: minifiedDoc
    }));

    const secondDoc = {
      _id: 'second_doc',
      contact: { _id: 'contact' },
      reported_date: moment.valueOf(),
      scheduled_tasks: [{
        due: now - 100,
        state: 'scheduled',
        message_key: 'the_other_message',
        recipient: 'clinic',
      }]
    };

    secondResponseRows.push({
      id: 'second_doc',
      key: ['scheduled', secondDoc.scheduled_tasks[0].due],
      doc: secondDoc
    });

    sinon.stub(rpn, 'get')
      .onCall(0).resolves({ rows: firstResponseRows })
      .onCall(1).resolves({ rows: secondResponseRows })
      .onCall(2).resolves({ rows: [] });

    const expectedPhone = '123456789';

    sinon.stub(schedule._lineage, 'hydrateDocs').callsFake(([ doc ]) => {
      doc.contact = {
        _id: 'contact',
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
      };
      return [JSON.parse(JSON.stringify(doc))];
    });

    sinon.stub(utils, 'translate').returns('Message for doc {{_id}}');
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 3);

      assert.deepNestedInclude(rpn.get.args[0][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 1000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', moment(now).subtract(7, 'days').valueOf() ]),
        }
      });
      assert.deepNestedInclude(rpn.get.args[1][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 2000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', minifiedDoc.scheduled_tasks[999].due ]),
          startkey_docid: minifiedDoc._id,
        }
      });
      assert.deepNestedInclude(rpn.get.args[2][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 2000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', secondDoc.scheduled_tasks[0].due ]),
          startkey_docid: secondDoc._id,
        }
      });

      assert.equal(schedule._lineage.hydrateDocs.callCount, 3);
      assert.equal(db.medic.put.callCount, 3);

      const firstSave = { _id: 'doc' };
      const secondSave = { _id: 'doc' };
      minifiedDoc.scheduled_tasks.forEach((task, idx) => {
        // first 1000 scheduled tasks are pending, others are still scheduled
        firstSave[`scheduled_tasks[${idx}].state`] = idx < 1000 ? 'pending' : 'scheduled';
        // first 1000 are "skipped" (they were updated in 1st batch)
        secondSave[`scheduled_tasks[${idx}].state`] = idx >= 1000 ? 'pending' : 'scheduled';
      });
      assert.deepNestedInclude(db.medic.put.args[0][0], firstSave);
      assert.deepNestedInclude(db.medic.put.args[1][0], secondSave);
      assert.deepNestedInclude(db.medic.put.args[2][0], {
        _id: 'second_doc',
        'scheduled_tasks[0].state': 'pending',
      });
    });
  });

  it('should work when the queue is saturated with a single doc with invalid records', () => {
    const now = moment().valueOf();
    sinon.stub(date, 'getDate').returns(moment(now));
    const scheduledTask = () => ({
      due: null,
      state: 'scheduled',
      message_key: 'incorrect',
      recipient: 'clinic',
    });

    const minifiedDoc = {
      _id: 'doc',
      contact: { _id: 'contact' },
      reported_date: now - 1000,
      scheduled_tasks: Array.from({ length: 2500 }).map(() => scheduledTask()),
    };

    const firstResponseRows = Array.from({ length: 1000 }).map(() => ({
      id: 'doc',
      key: ['scheduled', minifiedDoc.reported_date],
      doc: minifiedDoc
    }));

    const secondResponseRows = Array.from({ length: 2000 }).map(() => ({
      id: 'doc',
      key: ['scheduled', minifiedDoc.reported_date],
      doc: minifiedDoc
    }));

    const thirdResponseRows = Array.from({ length: 2500 }).map(() => ({
      id: 'doc',
      key: ['scheduled', minifiedDoc.reported_date],
      doc: minifiedDoc
    }));

    const secondDoc = {
      _id: 'second_doc',
      contact: { _id: 'contact' },
      reported_date: moment.valueOf(),
      scheduled_tasks: [{
        due: now - 100,
        state: 'scheduled',
        message_key: 'correct',
        recipient: 'clinic',
      }]
    };

    thirdResponseRows.push({
      id: 'second_doc',
      key: ['scheduled', secondDoc.scheduled_tasks[0].due],
      doc: secondDoc
    });

    sinon.stub(rpn, 'get')
      .onCall(0).resolves({ rows: firstResponseRows })
      .onCall(1).resolves({ rows: secondResponseRows })
      .onCall(2).resolves({ rows: thirdResponseRows })
      .onCall(3).resolves({ rows: [] });

    const expectedPhone = '123456789';

    sinon.stub(schedule._lineage, 'hydrateDocs').callsFake(([ doc ]) => {
      doc.contact = {
        _id: 'contact',
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
      };
      return [JSON.parse(JSON.stringify(doc))];
    });

    sinon.stub(utils, 'translate').withArgs('correct').returns('Message for doc {{_id}}');
    sinon.stub(db.medic, 'put').resolves();

    return schedule.execute().then(() => {
      assert.equal(rpn.get.callCount, 4);

      assert.deepNestedInclude(rpn.get.args[0][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 1000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', moment(now).subtract(7, 'days').valueOf() ]),
        }
      });
      assert.deepNestedInclude(rpn.get.args[1][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 2000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', minifiedDoc.reported_date ]),
          startkey_docid: minifiedDoc._id,
        }
      });
      assert.deepNestedInclude(rpn.get.args[2][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 4000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', minifiedDoc.reported_date ]),
          startkey_docid: minifiedDoc._id,
        }
      });
      assert.deepNestedInclude(rpn.get.args[3][0], {
        uri: '/_design/medic/_view/messages_by_state',
        qs: {
          include_docs: true,
          limit: 4000,
          endkey: JSON.stringify([ 'scheduled', now ]),
          startkey: JSON.stringify([ 'scheduled', secondDoc.scheduled_tasks[0].due ]),
          startkey_docid: secondDoc._id,
        }
      });

      assert.equal(schedule._lineage.hydrateDocs.callCount, 4);
      assert.equal(db.medic.put.callCount, 1);
      assert.deepNestedInclude(db.medic.put.args[0][0], {
        _id: 'second_doc',
        'scheduled_tasks[0].state': 'pending',
      });
    });
  });
});
