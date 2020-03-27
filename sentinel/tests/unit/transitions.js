const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../src/db');
const transitions = require('../../src/transitions');
const config = require('../../src/config');
const metadata = require('../../src/lib/metadata');
const feed = require('../../src/lib/feed');
const tombstoneUtils = require('@medic/tombstone-utils');

config.initTransitionLib();
const infodoc = config.getTransitionsLib().infodoc;

describe('transitions', () => {
  afterEach(() => {
    transitions._changeQueue.kill();
    sinon.restore();
  });

  describe('loadTransitions', () => {

    it('cancel is called when load throws', () => {
      const load = sinon.stub(transitions._transitionsLib, 'loadTransitions').throws();
      const listen = sinon.stub(feed, 'listen');
      const cancel = sinon.stub(feed, 'cancel');
      transitions.loadTransitions();
      assert.equal(load.callCount, 1);
      assert.equal(listen.callCount, 0);
      assert.equal(cancel.callCount, 1);
    });

    it('handles an empty change', done => {
      sinon.stub(metadata, 'update').resolves();
      const listen = sinon.stub(feed, 'listen');
      sinon.stub(transitions._transitionsLib, 'processChange').callsArgWith(1);

      transitions.loadTransitions();
      listen.args[0][0]();

      transitions._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(transitions._transitionsLib.processChange.callCount, 0);
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 0);
            done();
          });
        });
      });
    });

    it('processes deleted changes through TombstoneUtils to create tombstones', done => {
      sinon.stub(transitions._transitionsLib, 'loadTransitions').returns();
      sinon.stub(tombstoneUtils, 'processChange').resolves();
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(infodoc, 'delete').resolves();
      sinon.stub(db, 'allDbs').resolves([]);
      const listen = sinon.stub(feed, 'listen');

      transitions.loadTransitions();

      assert.equal(listen.callCount, 1);
      listen.args[0][0]({ id: 'somechange', seq: 55, deleted: true });

      transitions._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(tombstoneUtils.processChange.callCount, 1);
          assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
            id: 'somechange',
            seq: 55,
            deleted: true,
          });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 1);
            assert.equal(metadata.update.args[0][0], 55);
            done();
          });
        });
      });
    });

    it('does not advance metadata document if creating tombstone fails', done => {
      sinon.stub(tombstoneUtils, 'processChange').rejects();
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(infodoc, 'delete').resolves();
      sinon.stub(db, 'allDbs').resolves([]);
      const listen = sinon.stub(feed, 'listen');

      transitions.loadTransitions();
      listen.args[0][0]({ id: 'somechange', seq: 55, deleted: true });

      transitions._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(tombstoneUtils.processChange.callCount, 1);
          assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
            id: 'somechange',
            seq: 55,
            deleted: true,
          });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 0);
            done();
          });
        });
      });
    });

    it('runs transitions lib over changes', done => {
      sinon.stub(metadata, 'update').resolves();
      const listen = sinon.stub(feed, 'listen');
      sinon.stub(transitions._transitionsLib, 'processChange').callsArgWith(1);

      transitions.loadTransitions();
      listen.args[0][0]({ id: 'somechange', seq: 55 });

      transitions._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(transitions._transitionsLib.processChange.callCount, 1);
          assert.deepEqual(transitions._transitionsLib.processChange.args[0][0], { id: 'somechange', seq: 55 });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 1);
            assert.equal(metadata.update.args[0][0], 55);
            done();
          });
        });
      });
    });

  });

  describe('deleteReadDocs', () => {

    it('handles missing read doc', () => {
      db.medicDbName = 'medic';
      const given = { id: 'abc' };
      const metaDb = {
        remove: sinon.stub(),
        allDocs: sinon.stub().resolves({
          rows: [
            { key: 'read:message:abc', error: 'notfound' },
            { key: 'read:report:abc', error: 'notfound' }
          ]
        }),
      };
      sinon.stub(db, 'allDbs').resolves([`${db.medicDbName}-user-gareth-meta`]);
      sinon.stub(db, 'get').returns(metaDb);
      sinon.stub(db, 'close');
      return transitions._deleteReadDocs(given).then(() => {
        assert.equal(db.allDbs.callCount, 1);
        assert.equal(db.get.callCount, 1);
        assert.deepEqual(db.get.args[0], [`${db.medicDbName}-user-gareth-meta`]);
        assert.equal(metaDb.allDocs.callCount, 1);
        assert.deepEqual(metaDb.allDocs.args[0], [{ keys: ['read:report:abc', 'read:message:abc'] }]);
        assert.equal(metaDb.remove.callCount, 0);
        assert.equal(db.close.callCount, 1);
        assert.deepEqual(db.close.args[0], [metaDb]);
      });
    });

    it('deletes read doc for all users', () => {
      db.medicDbName = 'medic';
      const given = { id: 'abc' };
      const metaDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { key: 'read:message:abc', error: 'notfound' },
            { key: 'read:report:abc', id: 'read:report:abc', value: { rev: '1-rev' } }
          ]
        }),
        remove: sinon.stub().resolves()
      };
      const list = sinon.stub(db, 'allDbs').resolves([
        `${db.medicDbName}-user-gareth-meta`,
        `${db.medicDbName}-user-jim-meta`,
        db.medicDbName, // not a user db - must be ignored
      ]);
      const use = sinon.stub(db, 'get').returns(metaDb);
      sinon.stub(db, 'close');
      return transitions._deleteReadDocs(given).then(() => {
        assert.equal(list.callCount, 1);
        assert.equal(use.callCount, 2);
        assert.equal(use.args[0][0], `${db.medicDbName}-user-gareth-meta`);
        assert.equal(use.args[1][0], `${db.medicDbName}-user-jim-meta`);
        assert.equal(metaDb.allDocs.callCount, 2);
        assert.equal(metaDb.allDocs.args[0][0].keys.length, 2);
        assert.equal(metaDb.allDocs.args[0][0].keys[0], 'read:report:abc');
        assert.equal(metaDb.allDocs.args[0][0].keys[1], 'read:message:abc');
        assert.equal(metaDb.allDocs.args[1][0].keys.length, 2);
        assert.equal(metaDb.allDocs.args[1][0].keys[0], 'read:report:abc');
        assert.equal(metaDb.allDocs.args[1][0].keys[1], 'read:message:abc');
        assert.equal(metaDb.remove.callCount, 2);
        assert.deepEqual(metaDb.remove.args[0], ['read:report:abc', '1-rev']);
        assert.deepEqual(metaDb.remove.args[1], ['read:report:abc', '1-rev']);
        assert.equal(db.close.callCount, 2);
        assert.deepEqual(db.close.args, [[metaDb], [metaDb]]);
      });
    });

  });

});
