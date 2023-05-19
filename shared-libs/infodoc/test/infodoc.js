const assert = require('chai').assert;
const sinon = require('sinon').createSandbox();
const lib = require('../src/infodoc');

describe('infodoc', () => {
  const _ = () => {
    throw Error('unimplemented test stub');
  };

  const db = {
    medic: {
      allDocs: _,
      bulkDocs: _,
      remove: _
    },
    sentinel: {
      allDocs: _,
      bulkDocs: _,
      get: _,
      put: _
    }
  };

  lib.initLib(db.medic, db.sentinel);

  afterEach(() => sinon.restore());

  describe('retrieving infodocs', () => {
    it('provides a single doc get interface', () => {
      const change = {
        id: 'test',
        doc: {
          _id: 'test',
          _rev: '1-abc'
        }
      };
      const infodoc = {
        _id: 'test-info',
        _rev: '1-abc',
        type: 'info',
        doc_id: 'test',
        initial_replication_date: new Date(),
        latest_replication_date: new Date(),
        transitions: {}
      };
      const sentinelAllDocs = sinon.stub(db.sentinel, 'allDocs').resolves({rows: [{doc: infodoc}]});
      return lib.get(change)
        .then(result => {
          assert.equal(sentinelAllDocs.callCount, 1);
          assert.equal(sentinelAllDocs.args[0][0].keys[0], 'test-info');
          assert.deepEqual(result, infodoc);
        });
    });

    it('should do nothing when parameter is empty', () => {
      sinon.stub(db.sentinel, 'allDocs');
      sinon.stub(db.medic, 'allDocs');

      return Promise
        .all([
          lib.bulkGet(),
          lib.bulkGet(false),
          lib.bulkGet([])
        ])
        .then(results => {
          assert.equal(results[0], undefined);
          assert.equal(results[1], undefined);
          assert.equal(results[2], undefined);

          assert.equal(db.sentinel.allDocs.callCount, 0);
          assert.equal(db.medic.allDocs.callCount, 0);
        });
    });

    it('should return infodocs when all are found in sentinel db', () => {
      const changes = [
        { id: 'a', doc: {_id: 'a', _rev: '1-abc'}},
        { id: 'b', doc: {_id: 'b', _rev: '1-abc'}},
        { id: 'c', doc: {_id: 'c', _rev: '1-abc'}}
      ];
      const infoDocs = [
        { _id: 'a-info', transitions: {} }, { _id: 'b-info', transitions: {} }, { _id: 'c-info', transitions: {} }
      ];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, doc }))});
      sinon.stub(db.medic, 'allDocs');

      return lib.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', transitions: {} },
          { _id: 'b-info', transitions: {} },
          { _id: 'c-info', transitions: {} }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 0);
      });
    });

    it('should return infodocs when all are found in medic db', () => {
      const changes = [
        { id: 'a', doc: { _id: 'a', _rev: '1-abc', transitions: { some: 'a data' }}},
        { id: 'b', doc: { _id: 'b', _rev: '1-abc', transitions: { some: 'b data' }}},
        { id: 'c', doc: { _id: 'c', _rev: '1-abc', transitions: { some: 'c data' }}}
      ];
      const infoDocs = [
        { _id: 'a-info', _rev: 'a-r', type: 'info', doc_id: 'a' },
        { _id: 'b-info', _rev: 'b-r', type: 'info', doc_id: 'b' },
        { _id: 'c-info', _rev: 'c-r', type: 'info', doc_id: 'c' }
      ];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, error: 'not_found' }))});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, doc }))});
      sinon.stub(db.medic, 'bulkDocs')
        .resolves();


      return lib.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', type: 'info', doc_id: 'a', transitions: {some: 'a data'} },
          { _id: 'b-info', type: 'info', doc_id: 'b', transitions: {some: 'b data'} },
          { _id: 'c-info', type: 'info', doc_id: 'c', transitions: {some: 'c data'} }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
      });
    });

    it(
      'should try to fill transition info from the medic doc if sentinel infodocs exist with no transition info',
      () => {
        const changes = [
          { id: 'a', doc: { _id: 'a', _rev: '1-abc', transitions: { some: 'a data' }}},
          { id: 'b', doc: { _id: 'b', _rev: '1-abc', transitions: { some: 'b data' }}},
          { id: 'c', doc: { _id: 'c', _rev: '1-abc', transitions: { some: 'c data' }}}
        ];
        const infoDocs = [
          { _id: 'a-info', _rev: 'a-r', type: 'info', doc_id: 'a' },
          { _id: 'b-info', _rev: 'b-r', type: 'info', doc_id: 'b' },
          { _id: 'c-info', _rev: 'c-r', type: 'info', doc_id: 'c' }
        ];

        sinon.stub(db.sentinel, 'allDocs')
          .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, doc }))});
        sinon.stub(db.medic, 'allDocs')
          .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, error: 'not_found' }))});
        sinon.stub(db.medic, 'bulkDocs')
          .resolves();

        return lib.bulkGet(changes).then(result => {
          assert.deepEqual(result, [
            { _id: 'a-info', _rev: 'a-r', type: 'info', doc_id: 'a', transitions: {some: 'a data'} },
            { _id: 'b-info', _rev: 'b-r', type: 'info', doc_id: 'b', transitions: {some: 'b data'} },
            { _id: 'c-info', _rev: 'c-r', type: 'info', doc_id: 'c', transitions: {some: 'c data'} }
          ]);

          assert.equal(db.sentinel.allDocs.callCount, 1);
          assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
          assert.equal(db.medic.allDocs.callCount, 1);
          assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        });
      });

    it('should generate infodocs with unknown dates for existing documents, if they do not already exist', () => {
      const changes = [
        { id: 'a', doc: {_id: 'a', _rev: '1-abc' }},
        { id: 'b', doc: {_id: 'b', _rev: '1-abc' }},
        { id: 'c', doc: {_id: 'c', _rev: '1-abc' }}
      ];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});

      return lib.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          {
            _id: 'a-info', type: 'info', doc_id: 'a', initial_replication_date: 'unknown',
            latest_replication_date: 'unknown', transitions: undefined
          },
          {
            _id: 'b-info', type: 'info', doc_id: 'b', initial_replication_date: 'unknown',
            latest_replication_date: 'unknown', transitions: undefined
          },
          {
            _id: 'c-info', type: 'info', doc_id: 'c', initial_replication_date: 'unknown',
            latest_replication_date: 'unknown', transitions: undefined
          }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
      });
    });

    it('should generate infodocs with current dates for unsaved documents, if they do not already exist', () => {
      // This case arises in bulk SMS transition updating: the transitions (and thus getting the
      // infodocs) occurs before the document has been saved to the DB. So we can reasonably
      // accurately set the date here
      const changes = [
        { id: 'a', doc: {_id: 'a'}},
        { id: 'b', doc: {_id: 'b'}},
        { id: 'c', doc: {_id: 'c'}}
      ];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});

      const now = Date.now();

      return lib.bulkGet(changes).then(result => {
        assert.equal(result.length, 3);
        assert.deepInclude(result[0], { _id: 'a-info', type: 'info', doc_id: 'a', transitions: undefined });
        assert(result[0].initial_replication_date >= now);
        assert(result[0].latest_replication_date >= now);
        assert.deepInclude(result[1], { _id: 'b-info', type: 'info', doc_id: 'b', transitions: undefined });
        assert(result[1].initial_replication_date >= now);
        assert(result[1].latest_replication_date >= now);
        assert.deepInclude(result[2], { _id: 'c-info', type: 'info', doc_id: 'c', transitions: undefined });
        assert(result[2].initial_replication_date >= now);
        assert(result[2].latest_replication_date >= now);
      });
    });

    it('should work with a mix of all', () => {
      const changes = [
        { id: 'a', doc: {_id: 'a', _rev: '1-abc'} },
        { id: 'b', doc: {_id: 'b', _rev: '1-abc'} },
        { id: 'c', doc: {_id: 'c', _rev: '1-abc'} },
        { id: 'd', doc: {_id: 'd', _rev: '1-abc'} },
        { id: 'e', doc: {_id: 'e', _rev: '1-abc'} },
        { id: 'f', doc: {_id: 'f', _rev: '1-abc'} }
      ];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: [
          { key: 'a-info', id: 'a-info', doc: { _id: 'a-info', _rev: 'a-r', doc_id: 'a', transitions: {} } },
          { key: 'b-info', error: 'not_found' },
          { key: 'c-info', error: 'deleted' },
          { key: 'd-info', id: 'd-info', doc: { _id: 'd-info', _rev: 'd-r', doc_id: 'd', transitions: {} } },
          { key: 'e-info', error: 'deleted' },
          { key: 'f-info', error: 'something' },
        ]});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: [
          { key: 'b-info', id: 'b-info', doc: { _id: 'b-info', _rev: 'b-r', doc_id: 'b' } },
          { key: 'c-info', error: 'some error' },
          { key: 'e-info', error: 'some error' },
          { key: 'f-info', id: 'f-info', doc: { _id: 'f-info', _rev: 'f-r', doc_id: 'f' } },
        ]});
      sinon.stub(db.medic, 'bulkDocs').resolves();

      return lib.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', _rev: 'a-r', doc_id: 'a', transitions: {} },
          { _id: 'd-info', _rev: 'd-r', doc_id: 'd', transitions: {} },
          { _id: 'b-info', doc_id: 'b', transitions: undefined },
          { _id: 'f-info', doc_id: 'f', transitions: undefined },
          {
            _id: 'c-info', doc_id: 'c', initial_replication_date: 'unknown',
            latest_replication_date: 'unknown', type: 'info', transitions: undefined
          },
          {
            _id: 'e-info', doc_id: 'e', initial_replication_date: 'unknown',
            latest_replication_date: 'unknown', type: 'info', transitions: undefined
          },
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(
          db.sentinel.allDocs.args[0],
          [{ keys: ['a-info', 'b-info', 'c-info', 'd-info', 'e-info', 'f-info'], include_docs: true } ]
        );
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(
          db.medic.allDocs.args[0],
          [{ keys: ['b-info', 'c-info', 'e-info', 'f-info'], include_docs: true }]
        );
      });
    });
  });

  describe('bulkUpdate', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should do nothing when docs list is empty', () => {
      sinon.stub(db.sentinel, 'bulkDocs');
      sinon.stub(db.medic, 'bulkDocs');

      return Promise
        .all([
          lib.bulkUpdate(),
          lib.bulkUpdate(false),
          lib.bulkUpdate([])
        ])
        .then(() => {
          assert.equal(db.sentinel.bulkDocs.callCount, 0);
          assert.equal(db.medic.bulkDocs.callCount, 0);
        });
    });

    it('should save all docs when none are legacy', () => {
      const infoDocs = [ { _id: 'a-info' }, { _id: 'b-info' }, { _id: 'c-info' }, { _id: 'd-info' } ];

      sinon.stub(db.sentinel, 'bulkDocs').resolves(infoDocs.map(() => ({ok: true, rev: '1-abc'})));
      sinon.stub(db.medic, 'bulkDocs');

      return lib.bulkUpdate(infoDocs).then(() => {
        assert.equal(db.sentinel.bulkDocs.callCount, 1);
        assert.deepEqual(db.sentinel.bulkDocs.args[0], [[
          // We aren't *really* passing _rev values to bulkDocs: we are returning these values from
          // bulkDocs (see above) and then assigning them to the same reference
          { _id: 'a-info', _rev: '1-abc'},
          { _id: 'b-info', _rev: '1-abc'},
          { _id: 'c-info', _rev: '1-abc'},
          { _id: 'd-info', _rev: '1-abc'}
        ]]);
        assert.equal(db.medic.bulkDocs.callCount, 0);
      });
    });

    it('intelligently handles conflicts when storing the infodocs in sentinel', () => {
      const initialInfoDocs = [
        {
          _id: 'test-info',
          _rev: '1-abc',
          this: 'one will not conflict'
        },
        {
          _id: 'test2-info',
          _rev: '1-abc',
          this: 'one will',
          initial_replication_date: 'unknown',
          latest_replication_date: 'unknown',
          transitions: {
            'new': 'transition data'
          }
        }
      ];

      const sentinelBulkDocs = sinon.stub(db.sentinel, 'bulkDocs');
      const sentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      sentinelBulkDocs.onFirstCall().resolves([
        {
          ok: true,
          id: 'test-info',
          rev: '2-abc'
        },
        {
          id: 'test2-info',
          error: 'conflict',
          reason: 'Document update conflict.'
        }
      ]);
      sentinelAllDocs.resolves({ rows: [{ doc: {
        _id: 'test2-info',
        _rev: '1-bca',
        extra: 'data',
        initial_replication_date: new Date(),
        latest_replication_date: new Date(),
        transitions: {
          'old': 'transition data'
        }
      }}]});
      let secondWrite;
      sentinelBulkDocs.onSecondCall().callsFake(args => {
        secondWrite = Object.assign({}, args[0]);
        return Promise.resolve([{
          ok: true,
          id: 'test2-info',
          rev: '2-bca'
        }]);
      });

      return lib.bulkUpdate(initialInfoDocs)
        .then(() => {
          assert.equal(sentinelBulkDocs.callCount, 2);
          assert.equal(sentinelAllDocs.callCount, 1);
          assert.deepEqual(sentinelAllDocs.args[0][0].keys, ['test2-info']);
          assert.isOk(secondWrite.initial_replication_date instanceof Date);
          assert.isOk(secondWrite.latest_replication_date instanceof Date);
          assert.deepInclude(secondWrite, {
            _id: 'test2-info',
            _rev: '1-bca',
            this: 'one will',
            transitions: {
              new: 'transition data'
            }
          });
          assert.deepEqual(secondWrite.transitions, {'new': 'transition data'});
        });
    });
  });

  describe('updateTransition(s)', () => {
    it('updateTransition should set transition data', () => {
      const change = { seq: 12, doc: { _rev: 2 }, info: {}};
      lib.updateTransition(change, 'update_clinics', true);
      assert.deepEqual(
        change.info,
        {
          transitions: {
            update_clinics: { ok: true, seq: 12, last_rev: 2 }
          }
        });
      lib.updateTransition(change, 'accept_patient_reports', false);
      assert.deepEqual(
        change.info,
        {
          transitions: {
            update_clinics: { ok: true, seq: 12, last_rev: 2 },
            accept_patient_reports: { ok: false, seq: 12, last_rev: 2 }
          }
        });
    });

    it('saveTransitions should update infodoc', () => {
      const info = { _id: 'some-info', doc_id: 'some' };
      const change = {
        id: 'some',
        seq: 'seq',
        doc: { _rev: '123' },
        info: {
          _id: 'some-info',
          transitions: {
            one: { ok: true },
            two: { ok: false },
            three: { ok: true }
          }
        }
      };
      sinon.stub(db.sentinel, 'get').resolves(info);
      sinon.stub(db.sentinel, 'put').resolves();

      return lib.saveTransitions(change).then(() => {
        assert.equal(db.sentinel.get.callCount, 1);
        assert.deepEqual(db.sentinel.get.args[0], ['some-info']);
        assert.equal(db.sentinel.put.callCount, 1);
        assert.deepEqual(db.sentinel.put.args[0], [Object.assign(info, { transitions: change.info.transitions})]);
      });
    });

    it('should handle conflicts correctly', () => {
      const info = { _id: 'some-info', doc_id: 'some' };
      const change = {
        id: 'some',
        seq: 'seq',
        doc: { _rev: '123' },
        info: {
          _id: 'some-info',
          transitions: {
            one: { ok: true },
            two: { ok: false },
            three: { ok: true }
          }
        }
      };
      sinon.stub(db.sentinel, 'get').resolves(info);
      const sentinelPut = sinon.stub(db.sentinel, 'put');
      sentinelPut.rejects({ status: 409 });
      sentinelPut.onCall(20).resolves();

      return lib.saveTransitions(change).then(() => {
        assert.equal(db.sentinel.get.callCount, 21);
        assert.equal(db.sentinel.put.callCount, 21);
        assert.deepEqual(db.sentinel.put.args[20], [{ ...info, transitions: change.info.transitions }]);
      });
    });
  });

  describe('saveCompletedTasks', () => {
    it('saveCompletedTasks should update infodoc', () => {
      const serverInfo = { _id: 'some-info', _rev: 2, doc_id: 'some' };
      sinon.stub(db.sentinel, 'get').resolves(serverInfo);
      sinon.stub(db.sentinel, 'put').resolves();
      const providedInfo = {
        _id: 'some-info',
        _rev: 1,
        completed_tasks: { completed: 'tasks' },
      };

      return lib.saveCompletedTasks('some', providedInfo).then(() => {
        assert.equal(db.sentinel.get.callCount, 1);
        assert.deepEqual(db.sentinel.get.args[0], ['some-info']);
        assert.equal(db.sentinel.put.callCount, 1);
        assert.deepEqual(db.sentinel.put.args[0], [{ ...serverInfo, completed_tasks: providedInfo.completed_tasks }]);
      });
    });

    it('should handle conflicts correctly', () => {
      const serverInfo = { _id: 'some-info', _rev: 2, doc_id: 'some' };
      sinon.stub(db.sentinel, 'get').resolves(serverInfo);
      const sentinelPut = sinon.stub(db.sentinel, 'put');
      sentinelPut.rejects({ status: 409 });
      sentinelPut.onCall(45).resolves();

      const providedInfo = {
        _id: 'some-info',
        _rev: 1,
        completed_tasks: { success: 'tasks', failure: 'othertasks' },
      };

      return lib.saveCompletedTasks('some', providedInfo).then(() => {
        assert.equal(db.sentinel.get.callCount, 46);
        assert.equal(db.sentinel.put.callCount, 46);
        assert.deepEqual(db.sentinel.put.args[45], [{ ...serverInfo, completed_tasks: providedInfo.completed_tasks }]);
      });
    });
  });

  describe('recordDocumentWrites', () => {
    describe('update one', () => {
      let sentinelGet;
      let sentinelPut;
      beforeEach(() => {
        sentinelGet = sinon.stub(db.sentinel, 'get');
        sentinelPut = sinon.stub(db.sentinel, 'put');
      });
      afterEach(() => sinon.restore());

      it('creates a new infodoc if it does not exist', () => {
        sentinelGet.rejects({status: 404});
        sentinelPut.resolves();

        return lib.recordDocumentWrite('blah')
          .then(() => {
            assert.equal(sentinelGet.callCount, 1);
            assert.equal(sentinelPut.callCount, 1);
            assert.ok(sentinelPut.args[0][0].latest_replication_date instanceof Date);
            assert.ok(sentinelPut.args[0][0].initial_replication_date instanceof Date);
          });
      });

      it('updates the latest replication date on an existing infodoc', () => {
        sentinelGet.resolves({
          _id: 'blah-info',
          latest_replication_date: 'old date'
        });
        sentinelPut.resolves();

        return lib.recordDocumentWrite('blah')
          .then(() => {
            assert.equal(sentinelGet.callCount, 1);
            assert.equal(sentinelPut.callCount, 1);
            assert.ok(sentinelPut.args[0][0].latest_replication_date instanceof Date);
          });
      });

      it('it handles 409s correctly when editing an infodoc', () => {
        sentinelGet.onFirstCall().resolves({
          _id: 'blah-info',
          latest_replication_date: 'old date'
        });
        sentinelGet.onSecondCall().resolves({
          _id: 'blah-info',
          latest_replication_date: 'old date',
          some_new: 'info'
        });
        sentinelPut.onFirstCall().rejects({status: 409});
        sentinelPut.onSecondCall().resolves();

        return lib.recordDocumentWrite('blah')
          .then(() => {
            assert.equal(sentinelGet.callCount, 2);
            assert.equal(sentinelPut.callCount, 2);
            assert.ok(sentinelPut.args[1][0].latest_replication_date instanceof Date);
            assert.equal(sentinelPut.args[1][0].some_new, 'info');
          });
      });

      it('it handles 409s correctly when creating an infodoc', () => {
        sentinelGet.onFirstCall().rejects({status: 404});
        sentinelGet.onSecondCall().resolves({
          _id: 'blah-info',
          initial_replication_date: new Date(),
          some_new: 'info'
        });
        sentinelPut.onFirstCall().rejects({status: 409});
        sentinelPut.onSecondCall().resolves();

        return lib.recordDocumentWrite('blah')
          .then(() => {
            assert.equal(sentinelGet.callCount, 2);
            assert.equal(sentinelPut.callCount, 2);
            assert.notEqual(sentinelPut.args[1][0].latest_replication_date, 'old date');
            assert.ok(sentinelPut.args[1][0].latest_replication_date instanceof Date);
            assert.equal(sentinelPut.args[1][0].some_new, 'info');
          });
      });
    });

    describe('update many', () => {
      let sentinelAllDocs;
      let sentinelBulkDocs;
      beforeEach(() => {
        sentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
        sentinelBulkDocs = sinon.stub(db.sentinel, 'bulkDocs');
      });
      afterEach(() => sinon.restore());

      it('creates new infodocs and updates existing infodocs', () => {
        sentinelAllDocs.resolves({
          rows: [
            {
              key: 'new-doc-info',
              error: 'not_found'
            },
            {
              id: 'existing-doc-info',
              key: 'existing-doc-info',
              doc: {
                _id: 'existing-doc-info',
                initial_replication_date: 'ages ago',
                latest_replication_date: 'old date'
              }
            }
          ]
        });
        sentinelBulkDocs.resolves([
          {
            ok: true,
            id: 'new-doc-info',
            rev: '1-abc'
          },
          {
            ok: true,
            id: 'existing-doc-info',
            rev: '2-abc'
          },
        ]);

        return lib.recordDocumentWrites(['new-doc', 'existing-doc'])
          .then(() => {
            assert.equal(sentinelAllDocs.callCount, 1);
            assert.equal(sentinelBulkDocs.callCount, 1);
            assert.equal(sentinelBulkDocs.args[0][0][0]._id, 'new-doc-info');
            assert.ok(sentinelBulkDocs.args[0][0][0].latest_replication_date instanceof Date);
            assert.ok(sentinelBulkDocs.args[0][0][0].initial_replication_date instanceof Date);

            assert.equal(sentinelBulkDocs.args[0][0][1]._id, 'existing-doc-info');
            assert.ok(sentinelBulkDocs.args[0][0][1].latest_replication_date instanceof Date);
            assert.equal(sentinelBulkDocs.args[0][0][1].initial_replication_date, 'ages ago');
          });
      });
      it('Correctly works through and resolves conflicts when editing or creating infodocs', () => {
        // Attempting against two new docs and two existing
        sentinelAllDocs.onFirstCall().resolves({
          rows: [
            {
              key: 'new-doc-info',
              error: 'not_found'
            },
            {
              key: 'another-new-doc-info',
              error: 'not_found'
            },
            {
              id: 'existing-doc-info',
              key: 'existing-doc-info',
              doc: {
                _id: 'existing-doc-info',
                _rev: '1-abc',
                initial_replication_date: 'ages ago',
                latest_replication_date: 'old date'
              }
            },
            {
              id: 'another-existing-doc-info',
              key: 'another-existing-doc-info',
              doc: {
                _id: 'another-existing-doc-info',
                _rev: '1-abc',
                initial_replication_date: 'ages ago',
                latest_replication_date: 'old date'
              }
            }
          ]
        });
        // When we try to push changes: one new and one existing work fine, but the other two have conflicts!
        sentinelBulkDocs.onFirstCall().resolves([
          {
            ok: true,
            id: 'new-doc-info',
            rev: '1-abc'
          },
          {
            id: 'another-new-doc-info',
            error: 'conflict',
            reason: 'Document update conflict.'
          },
          {
            ok: true,
            id: 'existing-doc-info',
            rev: '2-abc'
          },
          {
            id: 'another-existing-doc-info',
            error: 'conflict',
            reason: 'Document update conflict.'
          },
        ]);
        // So we start again just for those conflicting two, getting them again...
        sentinelAllDocs.onSecondCall().resolves({
          rows: [
            {
              key: 'another-new-doc-info',
              doc: {
                _id: 'another-new-doc-info',
                _rev: '1-abc',
                some_new: 'data'
              }
            },
            {
              id: 'another-existing-doc-info',
              key: 'another-existing-doc-info',
              doc: {
                _id: 'another-existing-doc-info',
                _rev: '2-abc',
                initial_replication_date: 'ages ago',
                latest_replication_date: 'old date',
                some_new: 'data'
              }
            }
          ]
        });
        // ... and writing them again!
        sentinelBulkDocs.onSecondCall().resolves([
          {
            ok: true,
            id: 'another-new-doc-info',
            rev: '2-abc'
          },
          {
            ok: true,
            id: 'another-existing-doc-info',
            rev: '3-abc'
          }
        ]);

        return lib.recordDocumentWrites(['new-doc', 'another-new-doc', 'existing-doc', 'another-existing-doc'])
          .then(() => {
            assert.equal(sentinelAllDocs.callCount, 2);
            assert.equal(sentinelBulkDocs.callCount, 2);
            assert.deepEqual(
              sentinelAllDocs.args[0][0].keys,
              ['new-doc-info', 'another-new-doc-info', 'existing-doc-info', 'another-existing-doc-info']
            );
            assert.deepEqual(
              sentinelAllDocs.args[1][0].keys,
              ['another-new-doc-info', 'another-existing-doc-info']
            );
            assert.deepEqual(
              sentinelBulkDocs.args[0][0].map(d => d._id),
              ['new-doc-info', 'another-new-doc-info', 'existing-doc-info', 'another-existing-doc-info']
            );
            assert.deepEqual(
              sentinelBulkDocs.args[1][0].map(d => d._id),
              ['another-new-doc-info', 'another-existing-doc-info']
            );
          });
      });
    });
  });
});
