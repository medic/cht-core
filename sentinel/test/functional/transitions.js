var transitions = require('../../transitions/index'),
    sinon = require('sinon').sandbox.create(),
    db = require('../../db'),
    dbPouch = require('../../db-pouch'),
    config = require('../../config'),
    configGet;

exports.setUp = function(callback) {
  configGet = sinon.stub(config, 'get');
  callback();
};

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['transitions are only executed once if successful'] = function(test) {
  configGet.withArgs('transitions').returns({ conditional_alerts: {} });
  configGet.withArgs('alerts').returns({
    V: {
      form: 'V',
      recipient: 'reporting_unit',
      message: 'alert!',
      condition: 'true'
    }
  });

  var saveDoc = sinon.stub(db.audit, 'saveDoc').callsArg(1);
  var infoDoc = sinon.stub(dbPouch.sentinel, 'put').callsArg(1);

  transitions.loadTransitions();
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V'
    },
    info: {}
  };
  transitions.applyTransitions(change1, function() {
    test.equals(saveDoc.callCount, 1);
    test.equals(infoDoc.callCount, 1);
    var saved = saveDoc.args[0][0];
    var info = infoDoc.args[0][0];
    test.equals(info.transitions.conditional_alerts.seq, '44');
    test.equals(info.transitions.conditional_alerts.ok, true);
    test.equals(saved.tasks[0].messages[0].message, 'alert!');
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: saved,
      info: info
    };
    transitions.applyTransitions(change2, function() {
      // not updated
      test.equals(saveDoc.callCount, 1);
      test.done();
    });
  });
};

exports['transitions are only executed again if first run failed'] = function(test) {
  configGet.withArgs('transitions').returns({ conditional_alerts: {} });
  configGet.withArgs('alerts').returns({
    V: {
      form: 'V',
      recipient: 'reporting_unit',
      message: 'alert!',
      condition: 'doc.fields.last_menstrual_period == 15'
    }
  });
  var saveDoc = sinon.stub(db.audit, 'saveDoc').callsArg(1);
  var infoDoc = sinon.stub(dbPouch.sentinel, 'put').callsArg(1);

  transitions.loadTransitions();
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V'
    },
    info: {}
  };
  transitions.applyTransitions(change1, function() {
    // first run fails so no save
    test.equals(saveDoc.callCount, 0);
    test.equals(infoDoc.callCount, 0);
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: {
        type: 'data_record',
        form: 'V',
        fields: { last_menstrual_period: 15 }
      },
      info: {}
    };
    transitions.applyTransitions(change2, function() {
      test.equals(saveDoc.callCount, 1);
      test.equals(infoDoc.callCount, 1);
      var transitions = infoDoc.args[0][0].transitions;
      test.equals(transitions.conditional_alerts.seq, '45');
      test.equals(transitions.conditional_alerts.ok, true);
      test.done();
    });
  });
};

exports['transitions are executed again when subsequent transitions succeed'] = function(test) {
  configGet.withArgs('transitions').returns({
    conditional_alerts: {},
    default_responses: {},
  });
  configGet.withArgs('default_responses').returns({ start_date: '2010-01-01' });
  configGet.withArgs('alerts').returns({
    V: {
      form: 'V',
      recipient: 'reporting_unit',
      message: 'alert!',
      condition: 'doc.fields.last_menstrual_period == 15'
    }
  });
  var saveDoc = sinon.stub(db.audit, 'saveDoc').callsArg(1);
  var infoDoc = sinon.stub(dbPouch.sentinel, 'put').callsArg(1);

  transitions.loadTransitions();
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V',
      from: '123456798',
      reported_date: new Date()
    },
    info: {}
  };
  transitions.applyTransitions(change1, function() {
    test.equals(saveDoc.callCount, 1);
    test.equals(infoDoc.callCount, 1);
    var doc = saveDoc.args[0][0];
    var info = infoDoc.args[0][0];
    test.equals(info.transitions.default_responses.seq, '44');
    test.equals(info.transitions.default_responses.ok, true);

    doc.fields = { last_menstrual_period: 15 };
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: doc,
      info: info
    };
    transitions.applyTransitions(change2, function() {
      test.equals(saveDoc.callCount, 2);
      test.equals(infoDoc.callCount, 2);
      var info = infoDoc.args[1][0].transitions;
      test.equals(info.conditional_alerts.seq, '45');
      test.equals(info.conditional_alerts.ok, true);
      test.equals(info.default_responses.seq, '44');
      test.equals(info.default_responses.ok, true);
      test.done();
    });
  });
};
