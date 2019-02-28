var transitions,
  sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../src/db'),
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
    const infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

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

    transitions.applyTransitions(change1, (err, changed) => {
      assert.equal(infoDoc.callCount, 1);
      const info = infoDoc.args[0][0];
      assert.equal(info.transitions.conditional_alerts.seq, '44');
      assert.equal(info.transitions.conditional_alerts.ok, true);
      assert.equal(err, null);
      assert.equal(changed, true);
      assert.equal(change1.doc.tasks[0].messages[0].message, 'alert!');
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: change1.doc,
        info: info,
      };
      transitions.applyTransitions(change2, (err, changed) => {
        // not to be updated
        assert.equal(err, undefined);
        assert.equal(changed, undefined);
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
    const infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V',
      },
      info: {},
    };
    transitions.applyTransitions(change1, (err, changed) => {
      // first run fails so no save
      assert.equal(err, undefined);
      assert.equal(changed, undefined);
      assert.equal(infoDoc.callCount, 0);
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: {
          type: 'data_record',
          form: 'V',
          fields: { last_menstrual_period: 15 },
        },
        info: {},
      };
      transitions.applyTransitions(change2, (err, changed) => {
        assert.isNull(err);
        assert.equal(changed, true);
        assert.equal(change2.doc.tasks.length, 1);
        assert.equal(infoDoc.callCount, 1);
        const transitions = infoDoc.args[0][0].transitions;
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
    const infoDoc = sinon.stub(db.sentinel, 'put').resolves({});

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
        form: 'V',
        from: '123456798',
        fields: {},
        reported_date: new Date(),
      },
      info: {},
    };
    transitions.applyTransitions(change1, (err, changed) => {
      assert.equal(infoDoc.callCount, 1);
      assert.equal(changed, true);
      const info = infoDoc.args[0][0];
      assert.equal(info.transitions.default_responses.seq, '44');
      assert.equal(info.transitions.default_responses.ok, true);

      change1.doc.fields = { last_menstrual_period: 15 };
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: change1.doc,
        info: info,
      };
      transitions.applyTransitions(change2, (err, changed) => {
        assert.equal(infoDoc.callCount, 2);
        const info = infoDoc.args[1][0].transitions;
        assert.equal(info.conditional_alerts.seq, '45');
        assert.equal(info.conditional_alerts.ok, true);
        assert.equal(info.default_responses.seq, '44');
        assert.equal(info.default_responses.ok, true);
        assert.isNull(err);
        assert.equal(changed, true);
        done();
      });
    });
  });

  describe('processChange', () => {
    it('should throw lineage errors', done => {
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').rejects({ some: 'err' });
      transitions.processChange({ id: 'my_id' }, (err, result) => {
        assert.deepEqual(err, { some: 'err' });
        assert.isUndefined(result);
        done();
      });
    });

    it('should throw infodoc errors', done => {
      const doc = { _id: 'my_id', type: 'data_record', form: 'v' };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);
      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.sentinel, 'put').rejects({ some: 'err' });

      transitions.processChange({ id: 'my_id' }, (err, result) => {
        assert.equal(transitions._lineage.fetchHydratedDoc.callCount, 1);
        assert.deepEqual(transitions._lineage.fetchHydratedDoc.args[0], ['my_id']);
        assert.deepEqual(err, { some: 'err' });
        assert.isUndefined(result);
        done();
      });
    });

    it('should not update infodocs and not return the updated doc when no changes', done => {
      configGet.withArgs('transitions').returns({ conditional_alerts: {}, default_responses: {} });
      configGet.withArgs('alerts').returns({
        V: {
          form: 'V',
          recipient: 'reporting_unit',
          message: 'alert!',
          condition: 'true',
        },
      });
      configGet.withArgs('default_responses').returns({ start_date: '2019-01-01' });

      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.sentinel, 'put').resolves();

      const doc = {
        _id: 'my_id',
        reported_date: new Date().valueOf()
      };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      transitions.processChange({ id: doc._id}, (err, result) => {
        assert.isUndefined(err);
        assert.isUndefined(result);
        assert.equal(db.sentinel.get.callCount, 1);
        assert.equal(db.sentinel.put.callCount, 1); // initial creation
        assert.isUndefined(db.sentinel.put.args[0][0].transitions);
        done();
      });
    });

    it('should update infodocs and return updated minified doc when at least one change', done => {
      configGet.withArgs('transitions').returns({ conditional_alerts: {}, default_responses: {} });
      configGet.withArgs('alerts').returns({
        V: {
          form: 'V',
          recipient: 'reporting_unit',
          message: 'alert!',
          condition: 'true',
        },
      });
      configGet.withArgs('default_responses').returns({ start_date: '2019-01-01' });

      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.sentinel, 'put').resolves();

      const doc = {
        _id: 'my_id',
        form: 'V',
        from: '123456',
        type: 'data_record',
        reported_date: new Date('2018-01-01').valueOf()
      };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);
      sinon.stub(transitions._lineage, 'minify').callsFake(r => r);

      transitions.processChange({ id: doc._id }, (err, changed) => {
        assert.isNull(err);
        assert(changed);
        assert.equal(doc.tasks[0].messages[0].message, 'alert!');
        assert.equal(db.sentinel.get.callCount, 2);
        assert.equal(db.sentinel.put.callCount, 2);

        assert.equal(Object.keys(db.sentinel.put.args[1][0].transitions).length, 1);
        assert.equal(db.sentinel.put.args[1][0].transitions.conditional_alerts.ok, true);

        assert.equal(transitions._lineage.fetchHydratedDoc.callCount, 1);
        assert.equal(transitions._lineage.minify.callCount, 1);
        assert.deepEqual(transitions._lineage.minify.args[0], [doc]);
        done();
      });
    });
  });

  describe('processDocs', () => {
    it('should return same docs if no transitions are loaded', () => {

    });
  });
});
