const assert = require('chai').assert,
  sinon = require('sinon').sandbox.create(),
  db = require('../../../src/db-pouch'),
  infodoc = require('../../../src/lib/infodoc');

describe('infodoc', () => {
  afterEach(() => sinon.restore());

  it('gets infodoc from medic and moves it to sentinel', () => {
    const change = {id: 'messages-en'};
    const rev = '123';
    const info = {_id: 'messages-en-info', _rev: rev, transitions: []};

    const getSentinelInfo = sinon.stub(db.sentinel, 'get').resolves(null);
    const getMedicInfo = sinon.stub(db.medic, 'get').resolves(info);
    const removeLegacyInfo = sinon.stub(db.medic, 'remove').resolves(info);
    const updateSentinelInfo = sinon.stub(db.sentinel, 'put').resolves({});

    return infodoc.get(change).then(() => {
      assert(getSentinelInfo.calledOnce);
      assert.equal(getSentinelInfo.args[0], info._id);
      assert(getMedicInfo.calledOnce);
      assert.equal(getMedicInfo.args[0], info._id);
      assert(removeLegacyInfo.calledOnce);
      assert.deepEqual(removeLegacyInfo.args[0], [info._id, rev]);
      assert.equal(updateSentinelInfo.args[0][0]._id, info._id);
      assert(!updateSentinelInfo.args[0][0]._rev);
      assert.deepEqual(updateSentinelInfo.args[0][0].transitions, []);
    });
  });

  describe('bulkGet', () => {
    it('should do nothing when parameter is empty', () => {
      sinon.stub(db.sentinel, 'allDocs');
      sinon.stub(db.medic, 'allDocs');

      return Promise
        .all([
          infodoc.bulkGet(),
          infodoc.bulkGet(false),
          infodoc.bulkGet([])
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
      const changes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
            infoDocs = [{ _id: 'a-info' }, { _id: 'b-info' }, { _id: 'c-info' }];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, doc }))});
      sinon.stub(db.medic, 'allDocs');

      return infodoc.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info' },
          { _id: 'b-info' },
          { _id: 'c-info' }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 0);
      });
    });

    it('should return infodocs when all are found in medic db', () => {
      const changes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
            infoDocs = [{ _id: 'a-info', _rev: 'a-r' }, { _id: 'b-info', _rev: 'b-r' }, { _id: 'c-info', _rev: 'c-r' }];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, error: 'not_found' }))});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: infoDocs.map(doc => ({ key: doc._id, doc }))});

      return infodoc.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', _rev: 'a-r', legacy: true },
          { _id: 'b-info', _rev: 'b-r', legacy: true },
          { _id: 'c-info', _rev: 'c-r', legacy: true }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
      });
    });

    it('should generate infodocs when all are new', () => {
      const changes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});
      sinon.stub(db.medic, 'allDocs')
        .resolves({ rows: changes.map(doc => ({ key: `${doc.id}-info`, error: 'not_found' }))});

      return infodoc.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', type: 'info', doc_id: 'a', initial_replication_date: 'unknown'},
          { _id: 'b-info', type: 'info', doc_id: 'b', initial_replication_date: 'unknown' },
          { _id: 'c-info', type: 'info', doc_id: 'c', initial_replication_date: 'unknown' }
        ]);

        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0], [{ keys: ['a-info', 'b-info', 'c-info'], include_docs: true }]);
      });
    });

    it('should work with a mix of all', () => {
      const changes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }];

      sinon.stub(db.sentinel, 'allDocs')
        .resolves({ rows: [
            { key: 'a-info', id: 'a-info', doc: { _id: 'a-info', _rev: 'a-r', doc_id: 'a' } },
            { key: 'b-info', error: 'not_found' },
            { key: 'c-info', error: 'deleted' },
            { key: 'd-info', id: 'd-info', doc: { _id: 'd-info', _rev: 'd-r', doc_id: 'd' } },
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

      return infodoc.bulkGet(changes).then(result => {
        assert.deepEqual(result, [
          { _id: 'a-info', _rev: 'a-r', doc_id: 'a' },
          { _id: 'd-info', _rev: 'd-r', doc_id: 'd' },
          { _id: 'b-info', _rev: 'b-r', doc_id: 'b', legacy: true },
          { _id: 'c-info', doc_id: 'c', initial_replication_date: 'unknown', type: 'info' },
          { _id: 'e-info', doc_id: 'e', initial_replication_date: 'unknown', type: 'info' },
          { _id: 'f-info', _rev: 'f-r', doc_id: 'f', legacy: true },
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

    it('should throw sentinel all docs errors', () => {
      sinon.stub(db.sentinel, 'allDocs').rejects({ some: 'error' });

      return infodoc
        .bulkGet([{ id: 'a' }])
        .then(() => assert.fail())
        .catch(err => assert.deepEqual(err, { some: 'error' }));
    });

    it('should throw medic all docs errors', () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [{ key: 'a', error: true }] });
      sinon.stub(db.medic, 'allDocs').rejects({ some: 'error' });

      return infodoc
        .bulkGet([{ id: 'a' }])
        .then(() => assert.fail())
        .catch(err => assert.deepEqual(err, { some: 'error' }));
    });
  });

  describe('bulkUpdate', () => {
    let clock;

    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => sinon.restore());

    it('should do nothing when docs list is empty', () => {
      sinon.stub(db.sentinel, 'bulkDocs');
      sinon.stub(db.medic, 'bulkDocs');

      return Promise
        .all([
          infodoc.bulkUpdate(),
          infodoc.bulkUpdate(false),
          infodoc.bulkUpdate([])
        ])
        .then(() => {
          assert.equal(db.sentinel.bulkDocs.callCount, 0);
          assert.equal(db.medic.bulkDocs.callCount, 0);
        });
    });

    it('should save all docs when none are legacy', () => {
      sinon.stub(db.sentinel, 'bulkDocs').resolves();
      sinon.stub(db.medic, 'bulkDocs');

      const infoDocs = [ { _id: 'a-info' }, { _id: 'b-info' }, { _id: 'c-info' }, { _id: 'd-info' } ];

      return infodoc.bulkUpdate(infoDocs).then(() => {
        assert.equal(db.sentinel.bulkDocs.callCount, 1);
        assert.deepEqual(db.sentinel.bulkDocs.args[0], [[
          { _id: 'a-info', latest_replication_date: new Date() },
          { _id: 'b-info', latest_replication_date: new Date() },
          { _id: 'c-info', latest_replication_date: new Date() },
          { _id: 'd-info', latest_replication_date: new Date() }
        ]]);
        assert.equal(db.medic.bulkDocs.callCount, 0);
      });
    });

    it('should delete legacy docs after saving', () => {
      sinon.stub(db.sentinel, 'bulkDocs').resolves();
      sinon.stub(db.medic, 'bulkDocs').resolves();

      const infoDocs = [
        { _id: 'a-info', type: 'info', _rev: 'a-rev', legacy: true },
        { _id: 'b-info', type: 'info', _rev: 'b-rev', legacy: true },
        { _id: 'c-info', type: 'info', _rev: 'c-rev', legacy: true },
        { _id: 'd-info', type: 'info', _rev: 'd-rev' },
        { _id: 'e-info', type: 'info', _rev: 'e-rev' }
      ];

      return infodoc.bulkUpdate(infoDocs).then(() => {
        assert.equal(db.sentinel.bulkDocs.callCount, 1);
        assert.deepEqual(db.sentinel.bulkDocs.args[0], [[
          { _id: 'a-info', type: 'info', latest_replication_date: new Date() },
          { _id: 'b-info', type: 'info', latest_replication_date: new Date() },
          { _id: 'c-info', type: 'info', latest_replication_date: new Date() },
          { _id: 'd-info', type: 'info', _rev: 'd-rev', latest_replication_date: new Date() },
          { _id: 'e-info', type: 'info', _rev: 'e-rev', latest_replication_date: new Date() }
        ]]);

        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.deepEqual(db.medic.bulkDocs.args[0], [[
          { _id: 'a-info', type: 'info', _rev: 'a-rev', _deleted: true },
          { _id: 'b-info', type: 'info', _rev: 'b-rev', _deleted: true },
          { _id: 'c-info', type: 'info', _rev: 'c-rev', _deleted: true },
        ]]);
      });
    });

    it('should throw sentinel bulk docs errors', () => {
      sinon.stub(db.sentinel, 'bulkDocs').rejects({ some: 'error' });
      sinon.stub(db.medic, 'bulkDocs').resolves();

      return infodoc
        .bulkUpdate([{ _id: 'a' }])
        .then(() => assert.fail())
        .catch(err => {
          assert.deepEqual(err, { some: 'error' });
          assert.equal(db.medic.bulkDocs.callCount, 0);
          assert.equal(db.sentinel.bulkDocs.callCount, 1);
        });
    });

    it('should throw medic bulk docs errors', () => {
      sinon.stub(db.sentinel, 'bulkDocs').resolves();
      sinon.stub(db.medic, 'bulkDocs').rejects({ some: 'error' });

      return infodoc
        .bulkUpdate([{ _id: 'a', legacy: true }])
        .then(() => assert.fail())
        .catch(err => {
          assert.deepEqual(err, { some: 'error' });
          assert.equal(db.medic.bulkDocs.callCount, 1);
          assert.equal(db.sentinel.bulkDocs.callCount, 1);
        });
    });
  });
});
