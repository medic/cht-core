const sinon = require('sinon');
const chai = require('chai');
const assert = chai.assert;
const chaiExclude = require('chai-exclude');
const db = require('../../src/db');
const config = require('../../src/config');
const infodoc = require('@medic/infodoc');

chai.use(chaiExclude);

let updateClinics;
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
    updateClinics = require('../../src/transitions/update_clinics');
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
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
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

    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });
    const infoDoc = sinon.stub(infodoc, 'saveTransitions').resolves();

    transitions.loadTransitions();
    const change1 = {
      id: 'abc',
      seq: '44',
      doc: {
        type: 'data_record',
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
          type: 'data_record',
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

    const saveDoc = sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });
    const infoDoc = sinon.stub(infodoc, 'saveTransitions').resolves();

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
      const doc = { _id: 'my_id', _rev: '1-abc', type: 'data_record', form: 'v' };
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
        assert.isUndefined(err);
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

        sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });
        sinon.spy(transitions, 'applyTransitions');

        const doc = {
          _id: 'my_id',
          _rev: '1-abc',
          form: 'V',
          from: '123456',
          type: 'data_record',
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
      sinon.stub(db.medic, 'put').callsArgWith(1, { error: 'something' });

      const doc = {
        _id: 'my_id',
        _rev: '1-abc',
        form: 'V',
        from: '123456',
        type: 'data_record',
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
  });

  describe('processDocs', () => {
    it('should run all async transitions over docs and save all docs', () => {
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
          type: 'data_record',
          reported_date: new Date('2018-01-01').valueOf()
        },
        {
          id: 'has default response',
          from: 'phone2',
          type: 'data_record',
          sms_message: {
            message: 'I just sent an SMS',
            from: 'phone2',
          },
          reported_date: new Date().valueOf()
        },
        {
          id: 'random form that no transition runs on',
          form: 'F',
          type: 'data_record',
          content_type: 'xml',
          reported_date: new Date().valueOf()
        },
        {
          _id: 'some_id',
          id: 'random form with contact',
          form: 'C',
          type: 'data_record',
          contact: { _id: 'contact3', parent: { _id: 'clinic' } },
          from: 'phone3',
          reported_date: new Date().valueOf()
        },
        {
          id: 'will have errors',
          form: 'P',
          type: 'data_record',
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
        parent: { _id: 'clinic', type: 'clinic', name: 'Clinic' },
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

      sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });

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

      sinon.stub(updateClinics._lineage, 'fetchHydratedDoc').withArgs('contact1').resolves(contact1);

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
        assert.equal(infodocSaves.length, 1);
        assert.equal(infodocSaves[0][0].transitions.update_clinics.ok, true);
        assert.equal(infodocSaves[0][0].transitions.update_sent_by.ok, true);
        assert.equal(infodocSaves[0][0].transitions.conditional_alerts.ok, true);

        assert.equal(savedDocs[1].id, 'has default response');
        assert.equal(savedDocs[1]._id.length, 36);
        assert.equal(savedDocs[1].tasks.length, 1);
        assert.equal(savedDocs[1].tasks[0].messages[0].message, 'SMS received');
        assert.equal(savedDocs[1].errors.length, 1);
        assert.equal(savedDocs[1].errors[0].code, 'sys.facility_not_found');
        assert.deepEqualExcluding(savedDocs[1], originalDocs[1], ['_id', 'tasks', 'errors']);
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[1]._id);
        assert.equal(infodocSaves.length, 1);
        assert.equal(infodocSaves[0][0].transitions.default_responses.ok, true);
        assert.equal(infodocSaves[0][0].transitions.update_clinics.ok, true);

        assert.deepEqualExcluding(savedDocs[2], originalDocs[2], '_id');
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[2]._id);
        assert.equal(infodocSaves.length, 0);

        assert.equal(savedDocs[3].id, 'random form with contact');
        assert.equal(savedDocs[3].sent_by, 'Angela');
        assert.deepEqualExcluding(savedDocs[3], originalDocs[3], 'sent_by');
        infodocSaves = db.sentinel.put.args.filter(args => args[0].doc_id === savedDocs[3]._id);
        assert.equal(infodocSaves.length, 1);
        assert.equal(infodocSaves[0][0].transitions.default_responses.ok, true);
        assert.equal(infodocSaves[0][0].transitions.update_sent_by.ok, true);

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
        assert.equal(infodocSaves.length, 1);
        assert.equal(infodocSaves[0][0].transitions.default_responses.ok, true);
        assert.equal(infodocSaves[0][0].transitions.update_sent_by.ok, true);
        assert.equal(infodocSaves[0][0].transitions.accept_patient_reports.ok, true);
        assert.equal(infodocSaves[0][0].transitions.conditional_alerts.ok, true);
      });
    });
  });
});
