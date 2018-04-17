var transitions = require('../../transitions/index'),
    sinon = require('sinon').sandbox.create(),
    assert = require('chai').assert,
    db = require('../../db-nano'),
    config = require('../../config'),
    configGet;

describe('functional transitions', () => {
  beforeEach(() => { configGet = sinon.stub(config, 'get'); });
  afterEach(() => sinon.restore());

  it('transitions are only executed once if successful', done => {
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

    transitions.loadTransitions(false);
    var change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V'
      }
    };
    transitions.applyTransitions(change1, function() {
      assert.equal(saveDoc.callCount, 1);
      var saved = saveDoc.args[0][0];
      assert.equal(saved.transitions.conditional_alerts.seq, '44');
      assert.equal(saved.transitions.conditional_alerts.ok, true);
      assert.equal(saved.tasks[0].messages[0].message, 'alert!');
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: saved
      };
      transitions.applyTransitions(change2, function() {
        // not updated
        assert.equal(saveDoc.callCount, 1);
        done();
      });
    });
  });

  it('transitions are only executed again if first run failed', done => {
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

    transitions.loadTransitions(false);
    var change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V'
      }
    };
    transitions.applyTransitions(change1, function() {
      // first run fails so no save
      assert.equal(saveDoc.callCount, 0);
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: {
          type: 'data_record',
          form: 'V',
          fields: { last_menstrual_period: 15 }
        }
      };
      transitions.applyTransitions(change2, function() {
        assert.equal(saveDoc.callCount, 1);
        var saved2 = saveDoc.args[0][0].transitions;
        assert.equal(saved2.conditional_alerts.seq, '45');
        assert.equal(saved2.conditional_alerts.ok, true);
        done();
      });
    });
  });

  it('transitions are executed again when subsequent transitions succeed', done => {
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
    transitions.applyTransitions(change1, function() {
      assert.equal(saveDoc.callCount, 1);
      var saved = saveDoc.args[0][0].transitions;
      assert.equal(saved.default_responses.seq, '44');
      assert.equal(saved.default_responses.ok, true);

      var doc = saveDoc.args[0][0];
      doc.fields = { last_menstrual_period: 15 };
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: doc
      };
      transitions.applyTransitions(change2, function() {
        assert.equal(saveDoc.callCount, 2);
        var saved2 = saveDoc.args[1][0].transitions;
        assert.equal(saved2.conditional_alerts.seq, '45');
        assert.equal(saved2.conditional_alerts.ok, true);
        assert.equal(saved2.default_responses.seq, '44');
        assert.equal(saved2.default_responses.ok, true);
        done();
      });
    });
  });

});
