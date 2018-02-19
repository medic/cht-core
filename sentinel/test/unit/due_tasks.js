const sinon = require('sinon').sandbox.create(),
      moment = require('moment'),
      utils = require('../../lib/utils'),
      lineage = require('../../lib/lineage'),
      schedule = require('../../schedule/due_tasks');

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['due_tasks handles view returning no rows'] = function(test) {
  test.expect(3);

  var db = {
    view: function() {}
  };

  var audit = {
    saveDoc: function() {}
  };

  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: []
  });
  var saveDoc = sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

  schedule({ medic: db }, {}, function(err) {
    test.equals(err, undefined);
  });

  test.equals(view.callCount, 1);
  test.equals(saveDoc.callCount, 0);
  test.done();
};

exports['set all due scheduled tasks to pending'] = function(test) {
  var due = moment().toISOString();
  var notDue = moment().add(7, 'days').toISOString();
  var id = 'xyz';

  var db = {
    view: function() {}
  };
  var doc = {
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled'
      },
      {
        due: notDue,
        state: 'scheduled'
      }
    ]
  };
  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id,
        key: due,
        doc: doc
      }
    ]
  });

  var audit = {
    saveDoc: function(doc, callback) {
      callback();
    }
  };
  var saveDoc = sinon.spy(audit, 'saveDoc');
  var hydrate = sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([ doc ]));

  schedule({ medic: db }, audit, function(err) {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    var saved = saveDoc.firstCall.args[0];
    test.equals(saved.scheduled_tasks.length, 2);
    test.equals(saved.scheduled_tasks[0].due, due);
    test.equals(saved.scheduled_tasks[0].state, 'pending');
    test.equals(saved.scheduled_tasks[0].state_history.length, 1);
    test.equals(saved.scheduled_tasks[0].state_history[0].state, 'pending');
    test.ok(!!saved.scheduled_tasks[0].state_history[0].timestamp);
    test.equals(saved.scheduled_tasks[1].due, notDue);
    test.equals(saved.scheduled_tasks[1].state, 'scheduled');
    test.equals(hydrate.callCount, 1);
    test.deepEqual(hydrate.args[0][0], [ doc ]);
    test.done();
  });

};

exports['set all due scheduled tasks to pending and handles repeated rows'] = function(test) {
  test.expect(9);

  var due = moment().toISOString();
  var notDue = moment().add(7, 'days').toISOString();
  var id = 'xyz';
  var doc = {
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled'
      },
      {
        due: notDue,
        state: 'scheduled'
      }
    ]
  };
  var hydrate = sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([ doc ]));
  var db = {
    view: function() {}
  };
  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id,
        key: due,
        doc: doc
      },
      {
        id: id,
        key: due,
        doc: doc
      }
    ]
  });

  var audit = {
    saveDoc: function(doc, callback) {
      callback();
    }
  };
  var saveDoc = sinon.spy(audit, 'saveDoc');

  schedule({ medic: db }, audit, function(err) {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    test.equals(hydrate.callCount, 1);
    var saved = saveDoc.firstCall.args[0];
    test.equals(saved.scheduled_tasks.length, 2);
    test.equals(saved.scheduled_tasks[0].due, due);
    test.equals(saved.scheduled_tasks[0].state, 'pending');
    test.equals(saved.scheduled_tasks[1].due, notDue);
    test.equals(saved.scheduled_tasks[1].state, 'scheduled');
    test.done();
  });

};

exports['set all due scheduled tasks to pending and handles nonrepeated rows'] = function(test) {
  test.expect(9);

  var due = moment().toISOString();
  var id1 = 'xyz';
  var id2 = 'abc';
  var doc1 = {
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled'
      }
    ]
  };
  var doc2 = {
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled'
      }
    ]
  };

  var db = {
    view: function() {}
  };
  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id1,
        key: due,
        doc: doc1
      },
      {
        id: id2,
        key: due,
        doc: doc2
      }
    ]
  });
  sinon.stub(lineage, 'hydrateDocs')
    .onCall(0).returns(Promise.resolve([ doc1 ]))
    .onCall(1).returns(Promise.resolve([ doc2 ]));
  var audit = {
    saveDoc: function(doc, callback) {
      callback();
    }
  };
  var saveDoc = sinon.spy(audit, 'saveDoc');

  schedule({ medic: db }, audit, function(err) {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.equals(saveDoc.callCount, 2);
    var saved1 = saveDoc.firstCall.args[0];
    test.equals(saved1.scheduled_tasks.length, 1);
    test.equals(saved1.scheduled_tasks[0].due, due);
    test.equals(saved1.scheduled_tasks[0].state, 'pending');
    var saved2 = saveDoc.secondCall.args[0];
    test.equals(saved2.scheduled_tasks.length, 1);
    test.equals(saved2.scheduled_tasks[0].due, due);
    test.equals(saved2.scheduled_tasks[0].state, 'pending');
    test.done();
  });

};

exports['generates the messages for all due scheduled tasks'] = test => {
  const due = moment().toISOString();
  const notDue = moment().add(7, 'days').toISOString();
  const id = 'xyz';
  const expectedPhone = '5556918';
  const translate = sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
  const getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  const getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, { name: 'jim' });

  const db = {
    view: () => {}
  };
  const minified = {
    fields: {
      patient_id: '123'
    },
    contact: {
      _id: 'a',
      parent: {
        _id: 'b'
      }
    },
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: notDue,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      }
    ]
  };
  const hydrated = {
    fields: {
      patient_id: '123'
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
          phone: expectedPhone
        }
      }
    },
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: notDue,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      }
    ]
  };
  const view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id,
        key: due,
        doc: minified
      }
    ]
  });
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([ hydrated ]));
  const audit = {
    saveDoc: (doc, callback) => {
      callback();
    }
  };
  const saveDoc = sinon.spy(audit, 'saveDoc');

  schedule({ medic: db }, audit, err => {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    test.equals(translate.callCount, 1);
    test.equals(translate.args[0][0], 'visit-1');
    test.equals(getRegistrations.callCount, 1);
    test.equals(getPatientContact.callCount, 1);
    test.equals(getPatientContact.args[0][1], '123');
    const saved = saveDoc.firstCall.args[0];
    test.equals(saved.scheduled_tasks.length, 2);
    test.equals(saved.scheduled_tasks[0].messages.length, 1);
    test.equals(saved.scheduled_tasks[0].messages[0].to, expectedPhone);
    test.equals(saved.scheduled_tasks[0].messages[0].message, 'Please visit jim asap');
    test.equals(saved.scheduled_tasks[1].messages, undefined);
    test.done();
  });

};


exports['does not duplicate state history - task-utils integration'] = test => {
  const due = moment().toISOString();
  //const notDue = moment().add(7, 'days').toISOString();
  const id = 'xyz';
  const expectedPhone = '5556918';
  const translate = sinon.stub(utils, 'translate').returns('Please visit {{patient_name}} asap');
  const getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  const getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, { name: 'jim' });

  const db = {
    view: () => {}
  };
  const minified = {
    fields: {
      patient_id: '123'
    },
    contact: {
      _id: 'a',
      parent: {
        _id: 'b'
      }
    },
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'scheduled',
        timestamp: '111',
        state_history: [{
          state: 'scheduled',
          timestamp: '111'
        }],
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'pending',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'pending',
        timestamp: '0000',
        state_history: [{
          state: 'pending',
          timestamp: '0000'
        }],
        message_key: 'visit-1',
        recipient: 'clinic'
      }
    ]
  };
  const hydrated = {
    fields: {
      patient_id: '123'
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
          phone: expectedPhone
        }
      }
    },
    scheduled_tasks: [
      {
        due: due,
        state: 'scheduled',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'scheduled',
        timestamp: '111',
        state_history: [{
          state: 'scheduled',
          timestamp: '111'
        }],
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'pending',
        message_key: 'visit-1',
        recipient: 'clinic'
      },
      {
        due: due,
        state: 'pending',
        timestamp: '0000',
        state_history: [{
          state: 'pending',
          timestamp: '0000'
        }],
        message_key: 'visit-1',
        recipient: 'clinic'
      }
    ]
  };
  const view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id,
        key: due,
        doc: minified
      }
    ]
  });
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([ hydrated ]));
  const audit = {
    saveDoc: (doc, callback) => {
      callback();
    }
  };
  const saveDoc = sinon.spy(audit, 'saveDoc');

  schedule({ medic: db }, audit, err => {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    test.equals(translate.callCount, 4);
    test.equals(translate.args[0][0], 'visit-1');
    test.equals(getRegistrations.callCount, 1);
    test.equals(getPatientContact.callCount, 1);
    test.equals(getPatientContact.args[0][1], '123');
    const saved = saveDoc.firstCall.args[0];

    test.equals(saved.scheduled_tasks[0].state, 'pending');
    test.equals(saved.scheduled_tasks[0].state_details, undefined);
    test.notEqual(saved.scheduled_tasks[0].timestamp, undefined);
    test.equals(saved.scheduled_tasks[0].state_history.length, 1);
    test.equals(saved.scheduled_tasks[0].state_history[0].state, 'pending');

    test.equals(saved.scheduled_tasks[1].state, 'pending');
    test.equals(saved.scheduled_tasks[1].state_details, undefined);
    test.notEqual(saved.scheduled_tasks[1].timestamp, '111');
    test.equals(saved.scheduled_tasks[1].state_history.length, 2);
    test.equals(saved.scheduled_tasks[1].state_history[0].state, 'scheduled');
    test.equals(saved.scheduled_tasks[1].state_history[1].state, 'pending');

    test.equals(saved.scheduled_tasks[2].state, 'pending');
    test.equals(saved.scheduled_tasks[2].state_details, undefined);
    test.notEqual(saved.scheduled_tasks[2].timestamp, undefined);
    test.equals(saved.scheduled_tasks[2].state_history.length, 1);
    test.equals(saved.scheduled_tasks[2].state_history[0].state, 'pending');

    test.equals(saved.scheduled_tasks[3].state, 'pending');
    test.equals(saved.scheduled_tasks[3].state_details, undefined);
    test.notEqual(saved.scheduled_tasks[3].timestamp, '0000');
    test.equals(saved.scheduled_tasks[3].state_history.length, 1);
    test.equals(saved.scheduled_tasks[3].state_history[0].state, 'pending');
    test.notEqual(saved.scheduled_tasks[3].state_history[0].timestamp, '0000');

    test.done();
  });

};
