const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');
const logger = require('@medic/logger');
const db = require('../../../src/db');
const { stub } = require('sinon');
const outbound = require('@medic/outbound');
const infodocLib = require('@medic/infodoc');
const markForOutbound = require('../../../src/transitions/mark_for_outbound');

describe('mark for outbound', () => {
  describe('onMatch', () => {
    const RECORD_NAME = 'known_record';
    let change;
    let clock;

    beforeEach(() => {
      config.init({
        get: sinon.stub(),
        getAll: sinon.stub().returns({}),
      });
      change = {
        doc: { type: RECORD_NAME, id: 'RANDOM_UUID' },
        info: {},
      };

      sinon.stub(logger, 'error');
      sinon.stub(logger, 'info');

      sinon.stub(db.sentinel, 'put');
      sinon.stub(db.sentinel, 'get');
      stub(outbound, 'send');
    });

    afterEach(() => {
      clock?.restore();
      sinon.restore();
    });

    it('pushes docs with valid cron and relevant document and queue non due cron', () => {
      const configDoc = {
        'test-push-1': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
          cron: '* * * * *',
        },
        'test-push-2': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
          cron: 'BAD_CRON_EXPRESSION',
        },
        'test-push-3': {
          relevant_to: `doc.type === 'unknown_record'`,
        },
      };

      config.get.returns(configDoc);
      outbound.send.resolves(true);
      db.sentinel.put.resolves(true);
      db.sentinel.get.resolves({});

      return markForOutbound
        .onMatch(change)
        .then(() => {
          assert.equal(outbound.send.callCount, 1);
          assert.deepEqual(outbound.send.args[0], [
            configDoc['test-push-1'],
            'test-push-1',
            change.doc,
            {}
          ]);
          assert.equal(db.sentinel.put.callCount, 1);
          assert.equal(db.sentinel.get.callCount, 2);
          assert.equal(logger.info.callCount, 1);
        });
    });

    it('queues crons that are not due or push attempts that failed to send', () => {
      const configDoc = {
        'test-push-1': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
          cron: '* * * * *',
        },
        'test-push-2': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
          cron: '10 1 * * *',
        },
        'test-push-3': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
        },
      };

      config.get.returns(configDoc);
      outbound.send.rejects();
      db.sentinel.get.rejects({ status: 404 });

      clock = sinon.useFakeTimers({now: new Date('2023-07-11T03:05:00+0000').getTime()});

      return markForOutbound
        .onMatch(change)
        .then(() => {
          assert.equal(outbound.send.callCount, 2);
          assert.deepEqual(outbound.send.args[0], [
            configDoc['test-push-1'],
            'test-push-1',
            change.doc,
            {}
          ]);

          assert.deepEqual(outbound.send.args[1], [
            configDoc['test-push-3'],
            'test-push-3',
            change.doc,
            {}
          ]);
          assert.equal(db.sentinel.put.callCount, 1);
          assert.equal(db.sentinel.get.callCount, 1);
          assert.equal(logger.info.callCount, 1);

          assert.equal(db.sentinel.put.args[0][0].doc_id, change.doc._id);
          assert.equal(db.sentinel.put.args[0][0].queue.length, 3);
          assert.isTrue(db.sentinel.put.args[0][0].queue.includes('test-push-1'));
          assert.isTrue(db.sentinel.put.args[0][0].queue.includes('test-push-2'));
          assert.isTrue(db.sentinel.put.args[0][0].queue.includes('test-push-3'));
        });
    });

    it('returns false when no relevant configs exist', () => {
      const configDoc = {
        'test-push-1': {
          relevant_to: `doc.type === 'unknown_type'`,
        },
      };

      config.get.returns(configDoc);

      return markForOutbound
        .onMatch(change)
        .then(result => {
          assert.equal(result, false);
          assert.equal(outbound.send.callCount, 0);
          assert.equal(db.sentinel.get.callCount, 0);
        });
    });

    it('handles config.get returning null for outbound config in relevantTo', () => {
      config.get.returns(null);

      return markForOutbound
        .onMatch(change)
        .then(result => {
          assert.equal(result, false);
          assert.equal(outbound.send.callCount, 0);
        });
    });

    it('saves completed tasks when outbound send succeeds', () => {
      const configDoc = {
        'test-push-1': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
        },
      };

      change.info = {
        doc_id: 'test-doc-id',
        completed_tasks: ['task1'],
      };

      config.get.returns(configDoc);
      outbound.send.resolves(true);
      sinon.stub(infodocLib, 'saveCompletedTasks').resolves();

      return markForOutbound
        .onMatch(change)
        .then(result => {
          assert.equal(result, false);
          assert.equal(outbound.send.callCount, 1);
          assert.deepEqual(outbound.send.args[0], [
            configDoc['test-push-1'],
            'test-push-1',
            change.doc,
            change.info,
          ]);

          assert.equal(infodocLib.saveCompletedTasks.callCount, 1);
          assert.deepEqual(infodocLib.saveCompletedTasks.args[0], [
            'test-doc-id',
            change.info,
            ['task1'],
          ]);
        });
    });

    it('throws non-404 errors from sentinel get', () => {
      const configDoc = {
        'test-push-1': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
        },
      };

      config.get.returns(configDoc);
      outbound.send.rejects(new Error('send failed'));
      db.sentinel.get.rejects({ status: 500, message: 'server error' });

      return markForOutbound
        .onMatch(change)
        .then(() => assert.fail('Should have thrown'))
        .catch(err => {
          assert.equal(err.status, 500);
        });
    });
  });

  describe('filter', () => {
    it('returns true when outbound config has entries', () => {
      config.get.returns({ 'push-1': {} });
      assert.isTrue(markForOutbound.filter({}));
    });

    it('returns false when outbound config is empty', () => {
      config.get.returns({});
      assert.isFalse(markForOutbound.filter({}));
    });

    it('returns false when outbound config is undefined', () => {
      config.get.returns(undefined);
      assert.isFalse(markForOutbound.filter({}));
    });
  });
});
