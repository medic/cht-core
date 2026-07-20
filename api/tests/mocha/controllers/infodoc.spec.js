const { EventEmitter } = require('events');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const logger = require('@medic/logger');
const infodoc = require('../../../src/controllers/infodoc');

describe('Infodoc Controller', () => {
  afterEach(() => sinon.restore());

  describe('update handler', () => {
    describe('valid JSON responses', () => {
      it('should record single document write on successful response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(infodoc, 'recordDocumentWrite');

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from(JSON.stringify({ ok: true, id: 'doc-1', rev: '1-abc' })));
        mockProxyRes.emit('end');

        expect(infodoc.recordDocumentWrite.callCount).to.equal(1);
        expect(infodoc.recordDocumentWrite.args[0][0]).to.equal('doc-1');
      });

      it('should record bulk document writes on successful response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: {
            docs: [
              { _id: 'doc-1' },
              { _id: 'doc-2' }
            ]
          }
        };

        sinon.stub(infodoc, 'recordDocumentWrites');

        infodoc.update(mockProxyRes, mockReq);

        const bulkResponse = [
          { ok: true, id: 'doc-1', rev: '1-abc' },
          { ok: true, id: 'doc-2', rev: '1-def' }
        ];
        mockProxyRes.emit('data', Buffer.from(JSON.stringify(bulkResponse)));
        mockProxyRes.emit('end');

        expect(infodoc.recordDocumentWrites.callCount).to.equal(1);
        expect(infodoc.recordDocumentWrites.args[0][0]).to.deep.equal(['doc-1', 'doc-2']);
      });

      it('should handle chunked data correctly', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(infodoc, 'recordDocumentWrite');

        infodoc.update(mockProxyRes, mockReq);

        // Simulate chunked data delivery
        mockProxyRes.emit('data', Buffer.from('{"ok": '));
        mockProxyRes.emit('data', Buffer.from('true, "id": "doc-1", '));
        mockProxyRes.emit('data', Buffer.from('"rev": "1-abc"}'));
        mockProxyRes.emit('end');

        expect(infodoc.recordDocumentWrite.callCount).to.equal(1);
        expect(infodoc.recordDocumentWrite.args[0][0]).to.equal('doc-1');
      });
    });

    describe('invalid JSON responses (parse error handling)', () => {
      it('should not crash when response is HTML error page', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 500;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(logger, 'warn');
        sinon.stub(infodoc, 'recordDocumentWrite');

        infodoc.update(mockProxyRes, mockReq);

        // Emit HTML error page instead of JSON
        mockProxyRes.emit('data', Buffer.from('<html><body>Internal Server Error</body></html>'));
        mockProxyRes.emit('end');

        // Should have logged the parse error
        expect(logger.warn.callCount).to.equal(1);
        expect(logger.warn.args[0][0]).to.include('Invalid JSON in CouchDB response for infodoc update');
        expect(logger.warn.args[0][1]).to.equal(500); // status code

        // Should not have recorded any writes
        expect(infodoc.recordDocumentWrite.callCount).to.equal(0);
      });

      it('should log error with status code and error message', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 502;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(logger, 'warn');

        infodoc.update(mockProxyRes, mockReq);

        // Emit invalid JSON (truncated)
        mockProxyRes.emit('data', Buffer.from('{"incomplete": '));
        mockProxyRes.emit('end');

        expect(logger.warn.callCount).to.equal(1);
        expect(logger.warn.args[0][0]).to.include('Invalid JSON in CouchDB response for infodoc update');
        expect(logger.warn.args[0][1]).to.equal(502);
        expect(logger.warn.args[0][2]).to.include('Unexpected end of JSON');
      });

      it('should handle corrupted/truncated JSON response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 200;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { docs: [{ _id: 'doc-1' }] }
        };

        sinon.stub(logger, 'warn');
        sinon.stub(infodoc, 'recordDocumentWrites');

        infodoc.update(mockProxyRes, mockReq);

        // Emit truncated JSON (missing closing bracket)
        mockProxyRes.emit('data', Buffer.from('[{"ok": true, "id": "doc-1"'));
        mockProxyRes.emit('end');

        // Should have logged error
        expect(logger.warn.callCount).to.equal(1);

        // Should not have recorded writes
        expect(infodoc.recordDocumentWrites.callCount).to.equal(0);
      });

      it('should handle non-UTF8 corrupted bytes', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 200;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(logger, 'warn');

        infodoc.update(mockProxyRes, mockReq);

        // Emit invalid UTF-8 sequence that might parse but fail on JSON
        const invalidBuffer = Buffer.from([0xFF, 0xFE, 0x7B, 0x00]); // Invalid start for JSON
        mockProxyRes.emit('data', invalidBuffer);
        mockProxyRes.emit('end');

        // Should have handled gracefully
        expect(logger.warn.callCount).to.equal(1);
      });

      it('should not trigger infodoc recording when triggerInfoDocUpdate is false', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 201;
        const mockReq = {
          triggerInfoDocUpdate: false
        };

        sinon.stub(infodoc, 'recordDocumentWrite');

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('data', Buffer.from(JSON.stringify({ ok: true, id: 'doc-1', rev: '1-abc' })));
        mockProxyRes.emit('end');

        // Should not have been called
        expect(infodoc.recordDocumentWrite.callCount).to.equal(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty response body', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 204; // No content
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'doc-1' }
        };

        sinon.stub(logger, 'warn');

        infodoc.update(mockProxyRes, mockReq);

        mockProxyRes.emit('end'); // No data events

        expect(logger.warn.callCount).to.equal(1);
        expect(logger.warn.args[0][0]).to.include('Invalid JSON');
      });

      it('should skip recording on 404 response', () => {
        const mockProxyRes = new EventEmitter();
        mockProxyRes.statusCode = 404;
        const mockReq = {
          triggerInfoDocUpdate: true,
          body: { _id: 'nonexistent' }
        };

        sinon.stub(logger, 'warn');
        sinon.stub(infodoc, 'recordDocumentWrite');

        infodoc.update(mockProxyRes, mockReq);

        // Even if valid JSON returned for 404, infodoc logic should handle it
        mockProxyRes.emit('data', Buffer.from(JSON.stringify({ error: 'not_found' })));
        mockProxyRes.emit('end');

        // Error response from CouchDB still has JSON, so should process
        // But recordDocumentWrite should not be called (no ok: true)
        expect(infodoc.recordDocumentWrite.callCount).to.equal(0);
      });
    });
  });
});
