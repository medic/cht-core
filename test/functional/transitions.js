var transitions = require('../../transitions/index'),
    sinon = require('sinon'),
    config = require('../../config'),
    testUtils = require('../test_utils'),
    configGet;

exports.setUp = function(callback) {
  configGet = sinon.stub(config, 'get');
  callback();
};

exports.tearDown = function(callback) {
  testUtils.restore([config.get]);
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
  var saveDoc = sinon.stub();
  saveDoc.callsArg(1);

  transitions.loadTransitions(false);
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V'
    }
  };
  var audit = { saveDoc: saveDoc };
  transitions.applyTransitions({ audit: audit, change: change1 }, function() {
    test.equals(saveDoc.callCount, 1);
    var saved = saveDoc.args[0][0];
    test.equals(saved.transitions.conditional_alerts.seq, '44');
    test.equals(saved.transitions.conditional_alerts.ok, true);
    test.equals(saved.tasks[0].messages[0].message, 'alert!');
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: saveDoc.args[0][0]
    };
    transitions.applyTransitions({ audit: audit, change: change2 }, function() {
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
  var saveDoc = sinon.stub();
  saveDoc.callsArg(1);

  transitions.loadTransitions(false);
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V'
    }
  };
  var audit = { saveDoc: saveDoc };
  transitions.applyTransitions({ audit: audit, change: change1 }, function() {
    // first run fails so no save
    test.equals(saveDoc.callCount, 0);
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: {
        type: 'data_record',
        form: 'V',
        fields: { last_menstrual_period: 15 }
      }
    };
    transitions.applyTransitions({ audit: audit, change: change2 }, function() {
      test.equals(saveDoc.callCount, 1);
      var saved2 = saveDoc.args[0][0].transitions;
      test.equals(saved2.conditional_alerts.seq, '45');
      test.equals(saved2.conditional_alerts.ok, true);
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
  var saveDoc = sinon.stub();
  saveDoc.callsArg(1);

  transitions.loadTransitions(false);
  var change1 = {
    id: 'abc',
    seq: '44',
    doc: {
      type: 'data_record',
      form: 'V',
      from: '123456798',
      reported_date: new Date()
    }
  };
  var audit = { saveDoc: saveDoc };
  transitions.applyTransitions({ audit: audit, change: change1 }, function() {
    test.equals(saveDoc.callCount, 1);
    var saved = saveDoc.args[0][0].transitions;
    test.equals(saved.default_responses.seq, '44');
    test.equals(saved.default_responses.ok, true);

    var doc = saveDoc.args[0][0];
    doc.fields = { last_menstrual_period: 15 };
    var change2 = {
      id: 'abc',
      seq: '45',
      doc: doc
    };
    transitions.applyTransitions({ audit: audit, change: change2 }, function() {
      test.equals(saveDoc.callCount, 2);
      var saved2 = saveDoc.args[1][0].transitions;
      test.equals(saved2.conditional_alerts.seq, '45');
      test.equals(saved2.conditional_alerts.ok, true);
      test.equals(saved2.default_responses.seq, '44');
      test.equals(saved2.default_responses.ok, true);
      test.done();
    });
  });
};
