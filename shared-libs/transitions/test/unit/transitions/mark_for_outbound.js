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
    let doc;

    beforeEach(() => {
      doc = {
        doc: { type: RECORD_NAME },
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
          cron: '5 * * * *',
        },
        'test-push-3': {
          relevant_to: `doc.type === 'unknown_record'`,
        },
        'test-push-5': {
          relevant_to: `doc.type === '${RECORD_NAME}'`,
          cron: 'BAD_CRON_EXPRESSION',
        }
      };

      mockConfig.get.returns(config);

      mockOutbound.send.resolves(true);

      mockDb.sentinel.put.resolves(true);
      mockDb.sentinel.get.resolves({});

      return markForOutbound
        .onMatch(doc)
        .then(() => {
          assert.equal(mockDb.sentinel.get.callCount, 1);
          assert.equal(mockDb.sentinel.put.callCount, 2);
          assert.equal(mockOutbound.send.callCount, 2);

          // check the arguments of the calls to the functions so it's the right details
        });
    });
  });

  it('logs an error for invalid cron configuration and skips the config', () => {

  });

  it('queues crons that are not due or failed to send', () => {

  });
});


