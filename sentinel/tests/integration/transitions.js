var transitions,
  sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../src/db-pouch'),
  config = require('../../src/config'),
  configGet;

describe('functional transitions', () => {
  beforeEach(() => {
    configGet = sinon.stub(config, 'get');
    sinon.stub(db.medic, 'changes').returns({
      on: () => {
        return { on: () => {} };
      },
    });
    transitions = require('../../src/transitions/index');
  });
  afterEach(() => sinon.restore());

  it('transitions are only executed once if successful', done => {
    configGet.withArgs('transitions').returns({ conditional_alerts: {} });
    configGet.withArgs('alerts').returns({
      V: {
        form: 'V',
        recipient: 'reporting_unit',
        message: 'alert!',
        condition: 'true',
      },
    });
    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    var saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
    var infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

    transitions.loadTransitions();
    var change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V',
      },
      info: {},
    };
    transitions.applyTransitions(change1, function() {
      assert.equal(saveDoc.callCount, 1);
      assert.equal(infoDoc.callCount, 1);
      var saved = saveDoc.args[0][0];
      var info = infoDoc.args[0][0];
      assert.equal(info.transitions.conditional_alerts.seq, '44');
      assert.equal(info.transitions.conditional_alerts.ok, true);
      assert.equal(saved.tasks[0].messages[0].message, 'alert!');
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: saved,
        info: info,
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
        condition: 'doc.fields.last_menstrual_period == 15',
      },
    });

    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    var saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
    var infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

    transitions.loadTransitions();
    var change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V',
      },
      info: {},
    };
    transitions.applyTransitions(change1, function() {
      // first run fails so no save
      assert.equal(saveDoc.callCount, 0);
      assert.equal(infoDoc.callCount, 0);
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: {
          type: 'data_record',
          form: 'V',
          fields: { last_menstrual_period: 15 },
        },
        info: {},
      };
      transitions.applyTransitions(change2, function() {
        assert.equal(saveDoc.callCount, 1);
        assert.equal(infoDoc.callCount, 1);
        var transitions = infoDoc.args[0][0].transitions;
        assert.equal(transitions.conditional_alerts.seq, '45');
        assert.equal(transitions.conditional_alerts.ok, true);
        done();
      });
    });
  });

  it('transitions are executed again when subsequent transitions succeed', done => {
    configGet.withArgs('transitions').returns({
      conditional_alerts: {},
      default_responses: {},
    });
    configGet
      .withArgs('default_responses')
      .returns({ start_date: '2010-01-01' });
    configGet.withArgs('alerts').returns({
      V: {
        form: 'V',
        recipient: 'reporting_unit',
        message: 'alert!',
        condition: 'doc.fields.last_menstrual_period == 15',
      },
    });

    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    var saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
    var infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

    transitions.loadTransitions();
    var change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V',
        from: '123456798',
        reported_date: new Date(),
      },
      info: {},
    };
    transitions.applyTransitions(change1, function() {
      assert.equal(saveDoc.callCount, 1);
      assert.equal(infoDoc.callCount, 1);
      var doc = saveDoc.args[0][0];
      var info = infoDoc.args[0][0];
      assert.equal(info.transitions.default_responses.seq, '44');
      assert.equal(info.transitions.default_responses.ok, true);

      doc.fields = { last_menstrual_period: 15 };
      var change2 = {
        id: 'abc',
        seq: '45',
        doc: doc,
        info: info,
      };
      transitions.applyTransitions(change2, function() {
        assert.equal(saveDoc.callCount, 2);
        assert.equal(infoDoc.callCount, 2);
        var info = infoDoc.args[1][0].transitions;
        assert.equal(info.conditional_alerts.seq, '45');
        assert.equal(info.conditional_alerts.ok, true);
        assert.equal(info.default_responses.seq, '44');
        assert.equal(info.default_responses.ok, true);
        done();
      });
    });
  });
});
