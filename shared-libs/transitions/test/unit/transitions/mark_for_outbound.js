const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');
const logger = require('@medic/logger');
const db = require('../../../src/db');
const { stub } = require('sinon');
const outbound = require('@medic/outbound');
const markForOutbound = require('../../../src/transitions/mark_for_outbound');

config.init();

describe('mark for outbound', () => {
  describe('onMatch', () => {
    const RECORD_NAME = 'known_record';
    let change;
    let clock;

    beforeEach(() => {
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
          assert.equal(db.sentinel.put.callCount, 1);
          assert.equal(db.sentinel.get.callCount, 1);
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

      clock = sinon.useFakeTimers(new Date('2023-07-11T03:05:00+0000').getTime());

      return markForOutbound
        .onMatch(change)
        .then(() => {
          assert.equal(outbound.send.callCount, 2);
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
  });
});
