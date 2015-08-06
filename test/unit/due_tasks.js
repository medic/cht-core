var sinon = require('sinon'),
    moment = require('moment'),
    schedule = require('../../schedule/due_tasks');

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
  test.expect(11);

  var due = moment().toISOString();
  var notDue = moment().add(7, 'days').toISOString();
  var id = 'xyz';

  var db = {
    view: function() {}
  };
  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id,
        key: due,
        doc: {
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
        }
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
  });

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
  test.done();
};

exports['set all due scheduled tasks to pending and handles repeated rows'] = function(test) {
  test.expect(8);

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
  });

  test.equals(view.callCount, 1);
  test.equals(saveDoc.callCount, 1);
  var saved = saveDoc.firstCall.args[0];
  test.equals(saved.scheduled_tasks.length, 2);
  test.equals(saved.scheduled_tasks[0].due, due);
  test.equals(saved.scheduled_tasks[0].state, 'pending');
  test.equals(saved.scheduled_tasks[1].due, notDue);
  test.equals(saved.scheduled_tasks[1].state, 'scheduled');
  test.done();
};

exports['set all due scheduled tasks to pending and handles nonrepeated rows'] = function(test) {
  test.expect(9);

  var due = moment().toISOString();
  var id1 = 'xyz';
  var id2 = 'abc';

  var db = {
    view: function() {}
  };
  var view = sinon.stub(db, 'view').callsArgWith(3, null, {
    rows: [
      {
        id: id1,
        key: due,
        doc: {
          scheduled_tasks: [
            {
              due: due,
              state: 'scheduled'
            }
          ]
        }
      },
      {
        id: id2,
        key: due,
        doc: {
          scheduled_tasks: [
            {
              due: due,
              state: 'scheduled'
            }
          ]
        }
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
