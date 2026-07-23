const sinon = require('sinon');
const chai = require('chai');
const assert = chai.assert;
const chaiExclude = require('chai-exclude');
const db = require('../../src/db');
const config = require('../../src/config');
const infodoc = require('@medic/infodoc');
const dataContext = require('../../src/data-context');
const { Contact } = require('@medic/cht-datasource');
const { DOC_TYPES, CONTACT_TYPES } = require('@medic/constants');

chai.use(chaiExclude);

let transitions;
let configGet;

describe('functional transitions', () => {
  beforeEach(() => {
    configGet = sinon.stub();
    config.init({
      getAll: sinon.stub().returns({}),
      get: configGet,
      getTranslations: sinon.stub()
    });
    transitions = require('../../src/transitions/index');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('transitions are only executed once if successful', done => {
    configGet.withArgs('transitions').returns({ conditional_alerts: {} });
    configGet.withArgs('forms').returns({ V: { }});
    configGet.withArgs('alerts').returns({
      V: {
        form: 'V',
        recipient: 'reporting_unit',
        message: 'alert!',
        condition: 'true',
      },
    });
    const infoDocSave = sinon.stub(infodoc, 'saveTransitions').resolves();
    sinon.stub(infodoc, 'markTransitionsStarted').resolves();
    sinon.stub(infodoc, 'clearTransitionsStarted').resolves();
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: DOC_TYPES.DATA_RECORD,
        form: 'V',
        contact: {
          phone: '12345'
        }
      },
      info: {
        transitions: {}
      },
    };

    transitions.applyTransitions(change1, (err, changed) => {
      assert.equal(saveDoc.callCount, 1);
      assert.equal(infoDocSave.callCount, 1);
      const saved = saveDoc.args[0][0];
      const info = infoDocSave.args[0][0].info;
      assert.equal(info.transitions.conditional_alerts.seq, '44');
      assert.equal(info.transitions.conditional_alerts.ok, true);
      assert(!err);
      assert(changed.ok);
      assert.equal(change1.doc.tasks[0].messages[0].message, 'alert!');
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: saved,
        info: info,
      };
      transitions.applyTransitions(change2, err => {
        // not to be updated
        assert.equal(saveDoc.callCount, 1);
        assert(!err);
        done();
      });
    });
  });

  it('transitions are only executed again if first run failed', done => {
    configGet.withArgs('transitions').returns({ conditional_alerts: {} });
    configGet.withArgs('forms').returns({ V: { }});
    configGet.withArgs('alerts').returns({
      V: {
        form: 'V',
        recipient: 'reporting_unit',
        message: 'alert!',
        condition: 'doc.fields.last_menstrual_period == 15',
      },
    });

    const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
    const infoDoc = sinon.stub(infodoc, 'saveTransitions').resolves();
    sinon.stub(infodoc, 'markTransitionsStarted').resolves();
    sinon.stub(infodoc, 'clearTransitionsStarted').resolves();

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: DOC_TYPES.DATA_RECORD,
        form: 'V',
        contact: {
          phone: '12345'
        }
      },
      info: {},
    };
    transitions.applyTransitions(change1, (err, changed) => {
      // first run fails so no save
      assert(!err);
      assert(!changed);
      assert.equal(saveDoc.callCount, 0);
      assert.equal(infoDoc.callCount, 0);
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: {
          type: DOC_TYPES.DATA_RECORD,
          form: 'V',
          fields: { last_menstrual_period: 15 },
          contact: {
            phone: '12345'
          }
        },
        info: {},
      };
      transitions.applyTransitions(change2, (err, changed) => {
        assert(!err);
        assert(changed.ok);
        assert.equal(change2.doc.tasks.length, 1);
        assert.equal(saveDoc.callCount, 1);
        assert.equal(infoDoc.callCount, 1);
        const transitions = infoDoc.args[0][0].info.transitions;
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
    configGet.withArgs('forms').returns({ V: { }});

    const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
    const infoDoc = sinon.stub(infodoc, 'saveTransitions').resolves();
    sinon.stub(infodoc, 'markTransitionsStarted').resolves();
    sinon.stub(infodoc, 'clearTransitionsStarted').resolves();

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: DOC_TYPES.DATA_RECORD,
        form: 'V',
        from: '123456798',
        fields: {},
        reported_date: new Date(),
        contact: {
          phone: '12345'
        }
      },
      info: {},
    };
    transitions.applyTransitions(change1, (err, changed) => {
      assert.equal(saveDoc.callCount, 1);
      assert.equal(infoDoc.callCount, 1);
      assert(changed.ok);
      const doc = saveDoc.args[0][0];
      const info = infoDoc.args[0][0].info;
      assert.equal(info.transitions.default_responses.seq, '44');
      assert.equal(info.transitions.default_responses.ok, true);

      change1.doc.fields = { last_menstrual_period: 15 };
      const change2 = {
        id: 'abc',
        seq: '45',
        doc: doc,
        info: info,
      };
      transitions.applyTransitions(change2, (err, changed) => {
        assert.equal(saveDoc.callCount, 2);
        assert.equal(infoDoc.callCount, 2);
        const info = infoDoc.args[1][0].info.transitions;
        assert.equal(info.conditional_alerts.seq, '45');
        assert.equal(info.conditional_alerts.ok, true);
        assert.equal(info.default_responses.seq, '44');
        assert.equal(info.default_responses.ok, true);
        assert(!err);
        assert(changed.ok);
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
      const doc = { _id: 'my_id', _rev: '1-abc', type: DOC_TYPES.DATA_RECORD, form: 'v' };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      sinon.stub(infodoc, 'get').rejects({some: 'err'});

      transitions.processChange({ id: 'my_id' }, (err, result) => {
        assert.equal(transitions._lineage.fetchHydratedDoc.callCount, 1);
        assert.deepEqual(transitions._lineage.fetchHydratedDoc.args[0], ['my_id']);
        assert.deepEqual(err, { some: 'err' });
        assert.isUndefined(result);
        done();
      });
    });

    it('should not update infodocs, not save the doc and not return true when no changes', done => {
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
      configGet.withArgs('forms').returns({ V: { }});

      sinon.stub(infodoc, 'get').resolves({transitions: {}});
      sinon.stub(infodoc, 'saveTransitions').resolves();

      const doc = {
        _id: 'my_id',
        _rev: '1-abc',
        reported_date: new Date().valueOf()
      };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      transitions.loadTransitions();
      transitions.processChange({ id: doc._id}, (err, result) => {
        assert.isNull(err);
        assert.isUndefined(result);

        assert.equal(infodoc.get.callCount, 1);
        assert.equal(infodoc.saveTransitions.callCount, 0);

        done();
      });
    });

    [
      [{ _id: 'my_id-info', transitions: {} }, false],
      [{ _id: 'my_id-info' }, true]
    ].forEach(([info, initialProcessing]) => {
      it('should update infodocs and update minified doc and return true when at least one change', done => {
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
        configGet.withArgs('forms').returns({ V: { }});

        sinon.stub(infodoc, 'get').resolves(info);
        sinon.stub(infodoc, 'saveTransitions').resolves();
        sinon.stub(infodoc, 'markTransitionsStarted').resolves();
        sinon.stub(infodoc, 'clearTransitionsStarted').resolves();

        sinon.stub(db.medic, 'put').resolves({ ok: true });
        sinon.spy(transitions, 'applyTransitions');

        const doc = {
          _id: 'my_id',
          _rev: '1-abc',
          form: 'V',
          from: '123456',
          type: DOC_TYPES.DATA_RECORD,
          contact: {
            phone: '12345'
          },
          reported_date: new Date('2018-01-01').valueOf()
        };
        sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);
        sinon.stub(transitions._lineage, 'minify').callsFake(r => r);

        transitions.processChange({ id: doc._id }, (err, changed) => {
          assert(!err);
          assert(changed);
          assert.equal(doc.tasks[0].messages[0].message, 'alert!');
          assert.equal(infodoc.get.callCount, 1);
          assert.equal(infodoc.saveTransitions.callCount, 1);

          const saveWrite = infodoc.saveTransitions.args[0][0].info;
          assert.equal(Object.keys(saveWrite.transitions).length, 1);
          assert.equal(saveWrite.transitions.conditional_alerts.ok, true);
          assert.equal(db.medic.put.callCount, 1);

          assert.equal(transitions._lineage.fetchHydratedDoc.callCount, 1);
          assert.equal(transitions._lineage.minify.callCount, 1);
          assert.deepEqual(transitions._lineage.minify.args[0], [doc]);
          assert.equal(transitions.applyTransitions.callCount, 1);
          assert.deepEqual(
            transitions.applyTransitions.args[0][0],
            { id: doc._id, doc, info, initialProcessing }
          );
          done();
        });
      });
    });

    it('should return error from db put call when saving fails', (done) => {
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
      configGet.withArgs('forms').returns({ V: { }});

      sinon.stub(infodoc, 'get').resolves({});
      sinon.stub(infodoc, 'saveTransitions').resolves();
      sinon.stub(infodoc, 'markTransitionsStarted').resolves();
      sinon.stub(infodoc, 'clearTransitionsStarted').resolves();
      sinon.stub(db.medic, 'put').rejects({ error: 'something' });

      const doc = {
        _id: 'my_id',
        _rev: '1-abc',
        form: 'V',
        from: '123456',
        type: DOC_TYPES.DATA_RECORD,
        contact: {
          phone: '12345'
        },
        reported_date: new Date('2018-01-01').valueOf()
      };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);
      sinon.stub(transitions._lineage, 'minify').callsFake(r => r);

      transitions.processChange({ id: doc._id }, (err) => {
        assert.equal(err.error, 'something');
        assert.equal(doc.tasks[0].messages[0].message, 'alert!');
        assert.equal(db.medic.put.callCount, 1);

        assert.equal(transitions._lineage.fetchHydratedDoc.callCount, 1);
        assert.equal(transitions._lineage.minify.callCount, 1);
        assert.deepEqual(transitions._lineage.minify.args[0], [doc]);
        done();
      });
    });

    const RETRY_INTERVAL = 1000;
    const MAX_RETRIES = 30;
    const NOW = new Date('2026-06-30T12:00:00.000Z').valueOf();
    const MARKER = new Date(NOW).toISOString();
    // start processChange under fake timers; the caller advances the clock one interval at a time and
    // asserts the read count between ticks, so reads chained within a single tick can't slip through
    const startProcessChange = (change) => {
      const clock = sinon.useFakeTimers({ now: NOW });
      const processed = new Promise((resolve, reject) => {
        transitions.processChange(change, (err, result) => (err ? reject(err) : resolve(result)));
      });
      return { clock, processed };
    };

    it('should wait for transitions_started to clear before processing the change', async () => {
      configGet.withArgs('transitions').returns({ conditional_alerts: {} });
      configGet.withArgs('forms').returns({ V: { } });

      // infodoc is mid-write (API is running transitions) on the first two reads, then clears
      const get = sinon.stub(infodoc, 'get');
      get.onCall(0).resolves({ _id: 'my_id-info', transitions: {}, transitions_started: MARKER });
      get.onCall(1).resolves({ _id: 'my_id-info', transitions: {}, transitions_started: MARKER });
      get.onCall(2).resolves({ _id: 'my_id-info', transitions: {} });
      const saveTransitions = sinon.stub(infodoc, 'saveTransitions').resolves();
      const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

      const doc = { _id: 'my_id', _rev: '1-abc', reported_date: 1 };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      transitions.loadTransitions();
      // applyTransitions only runs on the process path; the skip path returns before reaching it
      const applyTransitions = sinon.spy(transitions, 'applyTransitions');
      const { clock, processed } = startProcessChange({ id: doc._id });

      // initial read happens before any retry timer fires
      await clock.tickAsync(0);
      assert.equal(get.callCount, 1);
      // assert the expected number of retries after RETRY_INTERVAL
      await clock.tickAsync(RETRY_INTERVAL);
      assert.equal(get.callCount, 2);
      await clock.tickAsync(RETRY_INTERVAL);
      assert.equal(get.callCount, 3);

      const result = await processed;
      assert.isUndefined(result);
      // marker cleared on the 3rd read, so no further retries
      assert.equal(get.callCount, 3);
      // the change was processed (applyTransitions ran) rather than skipped
      assert.equal(applyTransitions.callCount, 1);
      // no transition matched, so nothing is saved
      assert.equal(saveTransitions.callCount, 0);
      assert.equal(put.callCount, 0);
    });

    it('should clear the marker and process the change once the wait window is exhausted', async () => {
      configGet.withArgs('transitions').returns({ conditional_alerts: {} });
      configGet.withArgs('forms').returns({ V: { } });

      // marker stays set forever (API likely crashed mid-write and never cleared it)
      const get = sinon.stub(infodoc, 'get')
        .resolves({ _id: 'my_id-info', transitions: {}, transitions_started: MARKER });
      const clearTransitionsStarted = sinon.stub(infodoc, 'clearTransitionsStarted').resolves();
      const saveTransitions = sinon.stub(infodoc, 'saveTransitions').resolves();
      const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

      const doc = { _id: 'my_id', _rev: '1-abc', reported_date: 1 };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      transitions.loadTransitions();
      // applyTransitions only runs on the process path; a skip would return before reaching it
      const applyTransitions = sinon.spy(transitions, 'applyTransitions');
      const { clock, processed } = startProcessChange({ id: doc._id });

      // initial read happens before any retry timer fires
      await clock.tickAsync(0);
      assert.equal(get.callCount, 1);
      // one read per RETRY_INTERVAL; asserting between ticks proves the retries aren't chained
      for (let i = 1; i <= MAX_RETRIES; i++) {
        await clock.tickAsync(RETRY_INTERVAL);
        assert.equal(get.callCount, i + 1);
      }

      const result = await processed;
      assert.isUndefined(result);
      // initial read + MAX_RETRIES retries, then the wait window is exhausted
      assert.equal(get.callCount, MAX_RETRIES + 1);
      // the marker never cleared on its own, so we clear it and process the change (not skip)
      assert.equal(clearTransitionsStarted.callCount, 1);
      assert.deepEqual(clearTransitionsStarted.args[0], ['my_id']);
      assert.equal(applyTransitions.callCount, 1);
      assert.equal(saveTransitions.callCount, 0);
      assert.equal(put.callCount, 0);
    });

    it('should clear an already-stale marker on the first read, without waiting', async () => {
      configGet.withArgs('transitions').returns({ conditional_alerts: {} });
      configGet.withArgs('forms').returns({ V: { } });

      // marker was set longer ago than the wait window (API crashed earlier, or sentinel is catching up)
      const staleMarker = new Date(NOW - RETRY_INTERVAL * MAX_RETRIES).toISOString();
      const get = sinon.stub(infodoc, 'get')
        .resolves({ _id: 'my_id-info', transitions: {}, transitions_started: staleMarker });
      const clearTransitionsStarted = sinon.stub(infodoc, 'clearTransitionsStarted').resolves();
      const saveTransitions = sinon.stub(infodoc, 'saveTransitions').resolves();
      const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

      const doc = { _id: 'my_id', _rev: '1-abc', reported_date: 1 };
      sinon.stub(transitions._lineage, 'fetchHydratedDoc').resolves(doc);

      transitions.loadTransitions();
      const applyTransitions = sinon.spy(transitions, 'applyTransitions');
      const { clock, processed } = startProcessChange({ id: doc._id });

      // stale marker short-circuits the wait: a single read, no retries
      await clock.tickAsync(0);
      assert.equal(get.callCount, 1);

      const result = await processed;
      assert.isUndefined(result);
      // no retries were attempted - the stale marker was taken over immediately
      assert.equal(get.callCount, 1);
      assert.equal(clearTransitionsStarted.callCount, 1);
      assert.deepEqual(clearTransitionsStarted.args[0], ['my_id']);
      assert.equal(applyTransitions.callCount, 1);
      assert.equal(saveTransitions.callCount, 0);
      assert.equal(put.callCount, 0);
    });
  });

  describe('processDocs', () => {
    let getContactWithLineage;

    beforeEach(() => {
      getContactWithLineage = sinon.stub();
      dataContext.init({
        bind: sinon.stub().withArgs(Contact.v1.getWithLineage).returns(getContactWithLineage),
      });
    });

    it('should run all async transitions over docs and save all docs', () => {
      // fake Date only (not timers) so transitions_started has a known value we can assert exactly,
      // without interfering with the async flow the transitions rely on
      const STARTED = '2026-01-01T00:00:00.000Z';
      sinon.useFakeTimers({ now: new Date(STARTED).valueOf(), toFake: ['Date'] });
      configGet.withArgs('transitions').returns({
        conditional_alerts: { disabled: true },
        default_responses: {},
        update_clinics: {},
        muting: { async: true },
        update_sent_by: true,
        accept_patient_reports: { async: false }
      });
      configGet.withArgs('alerts').returns({
        V: {
          form: 'V',
          recipient: 'reporting_unit',
          message: 'alert!',
          condition: 'true',
        },
        P: {
          form: 'P',
          recipient: 'reporting_unit',
          message: 'too much randomness',
          condition: 'doc.fields.random_field > 200',
        }
      });
      configGet.withArgs('default_responses').returns({ start_date: '2019-01-01' });
      configGet.withArgs('patient_reports').returns([{
        form: 'P',
        validations: {
          list: [
            {
              property: 'random_field',
              rule: 'min(5) && max(10)',
              message: [{
                locale: 'en',
                content: 'Random field is incorrect'
              }],
            },
          ],
          join_responses: false
        }
      }]);
      configGet.withArgs('forms').returns({ V: { }, P: { }});

      const docs = [
        {
          id: 'has alert', // intentionally not _id, just used to identify the doc later in assertions
          // in this scenario these docs have not yet been saved to Couch, coming straight
          // from the SMS api
          form: 'V',
          from: 'phone1',
          type: DOC_TYPES.DATA_RECORD,
          reported_date: new Date('2018-01-01').valueOf()
        },
        {
          id: 'has default response',
          from: 'phone2',
          type: DOC_TYPES.DATA_RECORD,
          sms_message: {
            message: 'I just sent an SMS',
            from: 'phone2',
          },
          reported_date: new Date().valueOf()
        },
        {
          id: 'random form that no transition runs on',
          form: 'F',
          type: DOC_TYPES.DATA_RECORD,
          content_type: 'xml',
          reported_date: new Date().valueOf()
        },
        {
          _id: 'some_id',
          id: 'random form with contact',
          form: 'C',
          type: DOC_TYPES.DATA_RECORD,
          contact: { _id: 'contact3', parent: { _id: 'clinic' } },
          from: 'phone3',
          reported_date: new Date().valueOf()
        },
        {
          id: 'will have errors',
          form: 'P',
          type: DOC_TYPES.DATA_RECORD,
          contact: { _id: 'contact3', parent: { _id: 'clinic' } },
          from: 'phone3',
          fields: { random_field: 225 },
          reported_date: new Date().valueOf()
        }
      ];
      const originalDocs = JSON.parse(JSON.stringify(docs));

      const contact1 = {
        _id: 'contact1',
        phone: 'phone1',
        name: 'Merkel',
        type: 'person',
        parent: { _id: 'clinic', type: CONTACT_TYPES.CLINIC, name: 'Clinic' },
        reported_date: new Date().valueOf()
      };
      const contact3 = {
        _id: 'contact3',
        phone: 'phone3',
        name: 'Angela',
        type: 'person',
        parent: { _id: 'clinic' },
        reported_date: new Date().valueOf()
      };

      const bulkGetInfoDocs = ({ keys }) => {
        const rows = keys.map(key => ({ key }));
        return Promise.resolve({ rows });
      };

      const bulkDocsSuccess = docs => {
        return Promise.resolve(docs.map(() => ({ok: true, rev: '1-abc'})));
      };

      sinon.stub(transitions._lineage, 'hydrateDocs').callsFake(docs => {
        docs.forEach(doc => {
          if (doc.contact && doc.contact._id === contact3._id) {
            doc.contact = contact3;
          }
        });
        return Promise.resolve(docs);
      });
      sinon.stub(db.sentinel, 'allDocs').callsFake(bulkGetInfoDocs);
      sinon.stub(db.medic, 'allDocs').callsFake(bulkGetInfoDocs);
      sinon.stub(db.sentinel, 'bulkDocs').callsFake(bulkDocsSuccess);

      //update transitions
      sinon.stub(db.sentinel, 'get').callsFake(id => Promise.resolve({ id, doc_id: id.replace('-info', '') }));
      sinon.stub(db.sentinel, 'put').resolves();

      sinon.stub(db.medic, 'put').resolves({ ok: true });

      sinon.stub(db.medic, 'query')
      // update_clinics
        .withArgs('medic-client/contacts_by_phone', { key: 'phone1', include_docs: false, limit: 1 })
        .resolves({ rows: [{ id: 'contact1', key: 'phone1' }] })
        .withArgs('medic-client/contacts_by_phone', { key: 'phone2', include_docs: false, limit: 1 })
        .resolves({ rows: [{ key: 'phone2' }] })
        .withArgs('medic-client/contacts_by_phone', { key: 'phone3', include_docs: false, limit: 1 })
        .resolves({ rows: [{ id: 'contact3', key: 'phone3' }] })
        //update_sent_by
        .withArgs('medic-client/contacts_by_phone', { key: 'phone1', include_docs: true })
        .resolves({ rows: [{ id: 'contact1', doc: contact1 }] })
        .withArgs('medic-client/contacts_by_phone', { key: 'phone2', include_docs: true })
        .resolves({ rows: [{ key: 'phone2' }] })
        .withArgs('medic-client/contacts_by_phone', { key: 'phone3', include_docs: true })
        .resolves({ rows: [{ id: 'contact3', doc: contact3 }] });

      getContactWithLineage.resolves(contact1);

      config.getTranslations.returns({
        en: {
          sms_received: 'SMS received'
        }
      });

      transitions.loadTransitions(true);
      let infodocSaves;

      return transitions.processDocs(docs).then(result => {
        assert.equal(result.length, 5);
        assert.deepEqual(result, [{ ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }]);
        assert.equal(db.medic.put.callCount, 5);

        const savedDocs = db.medic.put.args.map(arg => arg[0]);

        assert.equal(savedDocs[0].id, 'has alert');
        assert.equal(savedDocs[0]._id.length, 36);
        assert(!savedDocs[0].errors);
        assert.deepEqual(savedDocs[0].contact, { _id: 'contact1', parent: { _id: 'clinic' } });
        assert.equal(savedDocs[0].sent_by, 'Merkel');
        assert.equal(savedDocs[0].tasks.length, 1);
        assert.equal(savedDocs[0].tasks[0].messages[0].message, 'alert!');
        assert.deepEqualExcluding(savedDocs[0], originalDocs[0], ['_id', 'errors', 'contact', 'sent_by', 'tasks']);
        // first doc is updated by 3 transitions
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[0]._id);
        assert.equal(infodocSaves.length, 2);
        // the first write only marks the infodoc as mid-write, with no transitions yet
        let startedSave = infodocSaves.find(args => args[0].transitions_started)[0];
        assert.deepEqual(startedSave, {
          id: `${savedDocs[0]._id}-info`,
          doc_id: savedDocs[0]._id,
          transitions_started: STARTED,
        });
        // the second write commits the transitions and removes the mid-write marker
        let txnSave = infodocSaves.find(args => args[0].transitions)[0];
        assert.isUndefined(txnSave.transitions_started);
        assert.sameMembers(
          Object.keys(txnSave.transitions),
          ['update_clinics', 'update_sent_by', 'conditional_alerts']
        );
        assert.equal(txnSave.transitions.update_clinics.ok, true);
        assert.equal(txnSave.transitions.update_sent_by.ok, true);
        assert.equal(txnSave.transitions.conditional_alerts.ok, true);

        assert.equal(savedDocs[1].id, 'has default response');
        assert.equal(savedDocs[1]._id.length, 36);
        assert.equal(savedDocs[1].tasks.length, 1);
        assert.equal(savedDocs[1].tasks[0].messages[0].message, 'SMS received');
        assert.equal(savedDocs[1].errors.length, 1);
        assert.equal(savedDocs[1].errors[0].code, 'sys.facility_not_found');
        assert.deepEqualExcluding(savedDocs[1], originalDocs[1], ['_id', 'tasks', 'errors']);
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[1]._id);
        assert.equal(infodocSaves.length, 2);
        startedSave = infodocSaves.find(args => args[0].transitions_started)[0];
        assert.deepEqual(startedSave, {
          id: `${savedDocs[1]._id}-info`,
          doc_id: savedDocs[1]._id,
          transitions_started: STARTED,
        });
        txnSave = infodocSaves.find(args => args[0].transitions)[0];
        assert.isUndefined(txnSave.transitions_started);
        assert.sameMembers(Object.keys(txnSave.transitions), ['default_responses', 'update_clinics']);
        assert.equal(txnSave.transitions.default_responses.ok, true);
        assert.equal(txnSave.transitions.update_clinics.ok, true);

        assert.deepEqualExcluding(savedDocs[2], originalDocs[2], '_id');
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[2]._id);
        // no transition changed this doc, so it is saved as-is with a single infodoc write (no marker)
        assert.equal(infodocSaves.length, 1);
        assert.isUndefined(infodocSaves[0][0].transitions_started);

        assert.equal(savedDocs[3].id, 'random form with contact');
        assert.equal(savedDocs[3].sent_by, 'Angela');
        assert.deepEqualExcluding(savedDocs[3], originalDocs[3], 'sent_by');
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[3]._id);
        assert.equal(infodocSaves.length, 2);
        startedSave = infodocSaves.find(args => args[0].transitions_started)[0];
        assert.deepEqual(startedSave, {
          id: `${savedDocs[3]._id}-info`,
          doc_id: savedDocs[3]._id,
          transitions_started: STARTED,
        });
        txnSave = infodocSaves.find(args => args[0].transitions)[0];
        assert.isUndefined(txnSave.transitions_started);
        assert.sameMembers(Object.keys(txnSave.transitions), ['default_responses', 'update_sent_by']);
        assert.equal(txnSave.transitions.default_responses.ok, true);
        assert.equal(txnSave.transitions.update_sent_by.ok, true);

        assert.equal(savedDocs[4].id, 'will have errors');
        assert.equal(savedDocs[4].sent_by, 'Angela');
        assert.equal(savedDocs[4].errors.length, 1);
        assert.deepEqual(
          savedDocs[4].errors[0],
          { code: 'invalid_random_field', message: 'Random field is incorrect' }
        );
        assert.equal(savedDocs[4].tasks.length, 2);
        assert.equal(savedDocs[4].tasks[0].messages[0].message, 'Random field is incorrect');
        assert.equal(savedDocs[4].tasks[1].messages[0].message, 'too much randomness');
        assert.deepEqualExcluding(savedDocs[4], originalDocs[4], ['_id', 'sent_by', 'errors', 'tasks']);
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[4]._id);
        assert.equal(infodocSaves.length, 2);
        startedSave = infodocSaves.find(args => args[0].transitions_started)[0];
        assert.deepEqual(startedSave, {
          id: `${savedDocs[4]._id}-info`,
          doc_id: savedDocs[4]._id,
          transitions_started: STARTED,
        });
        txnSave = infodocSaves.find(args => args[0].transitions)[0];
        assert.isUndefined(txnSave.transitions_started);
        assert.sameMembers(
          Object.keys(txnSave.transitions),
          ['default_responses', 'update_sent_by', 'accept_patient_reports', 'conditional_alerts']
        );
        assert.equal(txnSave.transitions.default_responses.ok, true);
        assert.equal(txnSave.transitions.update_sent_by.ok, true);
        assert.equal(txnSave.transitions.accept_patient_reports.ok, true);
        assert.equal(txnSave.transitions.conditional_alerts.ok, true);
      });
    });
  });
});
