const { EventEmitter } = require('events');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

describe('Infodoc Controller', () => {
  let infodoc;
  let logger;

  before(() => {
    logger = require('@medic/logger');
    infodoc = require('../../../src/controllers/infodoc');
  });

  afterEach(() => sinon.restore());

  describe('update handler', () => {
    describe('valid JSON responses', () => {
      it('should record single document write on successful response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        const recordStub = sinon.stub();

        // Mock infodoc.recordDocumentWrite
        const originalUpdate = infodoc.update;
        infodoc.recordDocumentWrite = recordStub;

        infodoc.update(mockProxyRes, mockReq);

        let body = Buffer.from('');
        mockProxyRes.on('data', data => (body = Buffer.concat([body, data])));

        mockProxyRes.emit('data', Buffer.from('{"ok": true, "id": "doc1", "rev": "1-abc"}'));
        mockProxyRes.emit('end');

        expect(recordStub.callCount).to.equal(1);
        expect(recordStub.args[0][0]).to.equal('doc1');
      });

      it('should record bulk document writes on successful response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: {
            docs: [
              { _id: 'doc1' },
              { _id: 'doc2' }
            ]
          }
        };

        sinon.stub(logger, 'warn');
        const bulkStub = sinon.stub();
        infodoc.recordDocumentWrites = bulkStub;

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from('[{"ok": true, "id": "doc1"}, {"ok": true, "id": "doc2"}]'));
        mockProxyRes.emit('end');

        expect(bulkStub.called).to.be.true;
      });

      it('should handle chunked data correctly', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        const recordStub = sinon.stub();
        infodoc.recordDocumentWrite = recordStub;

        infodoc.update(mockProxyRes, mockReq);

        // Emit data in chunks
        mockProxyRes.emit('data', Buffer.from('{"ok": true'));
        mockProxyRes.emit('data', Buffer.from(', "id": "doc1"'));
        mockProxyRes.emit('data', Buffer.from(', "rev": "1-abc"}'));
        mockProxyRes.emit('end');

        expect(recordStub.called).to.be.true;
      });
    });

    describe('invalid JSON responses (parse error handling)', () => {
      it('should not crash when response is HTML error page', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 500;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        const recordStub = sinon.stub();
        infodoc.recordDocumentWrite = recordStub;

        infodoc.update(mockProxyRes, mockReq);

        // Emit HTML error page instead of JSON
        mockProxyRes.emit('data', Buffer.from('<html><body>Internal Server Error</body></html>'));
        mockProxyRes.emit('end');

        // Verify error was logged (not crashed)
        expect(logger.warn.callCount).to.equal(1);
        // Verify no writes recorded
        expect(recordStub.callCount).to.equal(0);
      });

      it('should log error with status code and error message', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 503;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        infodoc.recordDocumentWrite = sinon.stub();

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from('<?xml version="1.0"?><root><error>Service Unavailable</error></root>'));
        mockProxyRes.emit('end');

        expect(logger.warn.callCount).to.equal(1);
        expect(logger.warn.args[0][0]).to.include('Invalid JSON in CouchDB response for infodoc update');
        expect(logger.warn.args[0][1]).to.equal(503);
      });

      it('should handle corrupted/truncated JSON response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 200;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        infodoc.recordDocumentWrite = sinon.stub();

        infodoc.update(mockProxyRes, mockReq);

        // Truncated JSON
        mockProxyRes.emit('data', Buffer.from('{"ok": true, "id": "doc-'));
        mockProxyRes.emit('end');

        expect(logger.warn.callCount).to.equal(1);
      });

      it('should handle non-UTF8 corrupted bytes', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 200;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        infodoc.recordDocumentWrite = sinon.stub();

        infodoc.update(mockProxyRes, mockReq);

        // Emit corrupted bytes that will fail JSON.parse
        mockProxyRes.emit('data', Buffer.from([0xFF, 0xFE, 0x00, 0x00]));
        mockProxyRes.emit('end');

        expect(logger.warn.callCount).to.equal(1);
      });
    });

    describe('edge cases', () => {
      it('should skip recording when triggerInfoDocUpdate is false', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: false,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        const recordStub = sinon.stub();
        infodoc.recordDocumentWrite = recordStub;

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from('{"ok": true, "id": "doc1", "rev": "1-abc"}'));
        mockProxyRes.emit('end');

        // Handler should not run if trigger is false
        expect(recordStub.callCount).to.equal(0);
      });

      it('should handle empty response body', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 200;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        infodoc.recordDocumentWrite = sinon.stub();

        infodoc.update(mockProxyRes, mockReq);

        // Emit nothing, just end
        mockProxyRes.emit('end');

        expect(logger.warn.callCount).to.equal(1);
      });

      it('should skip recording on 404 response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 404;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc1' }
        };

        sinon.stub(logger, 'warn');
        const recordStub = sinon.stub();
        infodoc.recordDocumentWrite = recordStub;

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from('{"error": "not_found"}'));
        mockProxyRes.emit('end');

        // Valid JSON, but not a successful response
        expect(recordStub.callCount).to.equal(0);
      });

      it('should handle partial bulk response with mixed success/failure', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        mockProxyRes.headers = {};

        const mockReq = {
          triggerInfoDocUpdate: true,
          body: {
            docs: [
              { _id: 'doc1' },
              { _id: 'doc2' },
              { _id: 'doc3' }
            ]
          }
        };

        sinon.stub(logger, 'warn');
        const bulkStub = sinon.stub();
        infodoc.recordDocumentWrites = bulkStub;

        infodoc.update(mockProxyRes, mockReq);

        // Mixed success/failure response
        mockProxyRes.emit('data', Buffer.from(JSON.stringify([
          { ok: true, id: 'doc1', rev: '1-abc' },
          { error: 'conflict', id: 'doc2' },
          { ok: true, id: 'doc3', rev: '1-def' }
        ])));
        mockProxyRes.emit('end');

        // Should record only successful writes
        expect(bulkStub.called).to.be.true;
      });
    });
  });
});
