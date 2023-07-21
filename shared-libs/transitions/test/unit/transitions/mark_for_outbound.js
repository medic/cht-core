const rewire = require('rewire');
const sinon = require('sinon');
const assert = require('chai').assert;

const markForOutbound = rewire('../../../src/transitions/mark_for_outbound');

describe('mark for outbound', () => {
  afterEach(() => sinon.restore());

  describe('onMatch', () => {
    const restores = [];
    const RECORD_NAME = 'known_record';
    let mockDb; 
    let mockConfig; 
    let mockOutbound;
    let mockLogger;
    let change;

    beforeEach(() => {
      change = {
        doc: { type: RECORD_NAME, id: 'RANDOM_UUID' },
        info: {},
      };

      mockConfig = {
        get: sinon.stub(),
      };
      
      restores.push(markForOutbound.__set__('config', mockConfig));

      mockOutbound = {
        send: sinon.stub(),
      };

      restores.push(markForOutbound.__set__('outbound', mockOutbound));

      mockDb = {
        sentinel: {
          put: sinon.stub(),
          get: sinon.stub(),
        }
      };

      restores.push(markForOutbound.__set__('db', mockDb));
  
      mockLogger = {
        error: sinon.stub(),
        info: sinon.stub(),
      };

      restores.push(markForOutbound.__set__('logger', mockLogger));
    });

    afterEach(() => restores.forEach(restore => restore()));

    it('pushes docs with valid cron and relevant document and queue non due cron', () => {
      const config = {
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

      mockConfig.get.returns(config);
      mockOutbound.send.resolves(true);
      mockDb.sentinel.put.resolves(true);
      mockDb.sentinel.get.resolves({});

      return markForOutbound
        .onMatch(change)
        .then(() => {
          assert.equal(mockOutbound.send.callCount, 1);
          assert.equal(mockDb.sentinel.put.callCount, 1);
          assert.equal(mockDb.sentinel.get.callCount, 0);
          assert.equal(mockLogger.error.callCount, 1);

          assert.deepEqual(mockOutbound.send.args[0][0], config['test-push-1']);
          assert.deepEqual(mockOutbound.send.args[0][1], 'test-push-1');
          assert.deepEqual(mockOutbound.send.args[0][2], change.doc);
          assert.deepEqual(mockOutbound.send.args[0][3], change.info);
        });
    });

    it('queues crons that are not due or push attempts that failed to send', () => {
      const config = {
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

      mockConfig.get.returns(config);
      mockOutbound.send.rejects();
      mockDb.sentinel.get.rejects({ status: 404 });

      sinon.useFakeTimers(new Date('2023-07-11T03:05:00+0000').getTime());

      return markForOutbound
        .onMatch(change)
        .then(() => {
          assert.equal(mockOutbound.send.callCount, 2);
          assert.equal(mockDb.sentinel.put.callCount, 1);
          assert.equal(mockDb.sentinel.get.callCount, 1);
          assert.equal(mockLogger.info.callCount, 1);

          assert.equal(mockDb.sentinel.put.args[0][0].doc_id, change.doc._id);
          assert.equal(mockDb.sentinel.put.args[0][0].queue.length, 3);
          assert.isTrue(mockDb.sentinel.put.args[0][0].queue.includes('test-push-1'));
          assert.isTrue(mockDb.sentinel.put.args[0][0].queue.includes('test-push-2'));
          assert.isTrue(mockDb.sentinel.put.args[0][0].queue.includes('test-push-3'));
        });
    });
  });
});
