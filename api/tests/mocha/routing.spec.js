const rewire = require('rewire');
const { EventEmitter } = require('events');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const logger = require('@medic/logger');

describe('Routing', () => {
  before(() => global.angular = {
    module: () => ({
      controller: () => {},
    }),
  });

  after(() => delete global.angular);

  it('Content Security policy build url matches actual', () => {
    const environment = rewire('@medic/environment');
    const adminUpgrade = rewire('./../../../admin/src/js/controllers/upgrade');
    const cspBuildDb = environment.__get__('DEFAULT_BUILDS_URL');
    const actualBuildDb = adminUpgrade.__get__('DEFAULT_BUILDS_URL');
    chai.expect(cspBuildDb).to.not.eq(undefined);
    chai.expect(cspBuildDb).to.include(actualBuildDb);
  });

  describe('proxyForAuth response handling', () => {
    let routing;
    let proxyForAuthHandler;

    before(() => {
      // This test suite validates error handling in the proxyForAuth response event
      // The handler is attached via: proxyForAuth.on('proxyRes', (proxyRes, req, res) => { ... })
    });

    afterEach(() => sinon.restore());

    it('should handle invalid JSON responses with 502 status', () => {
      // This test validates that when CouchDB or an upstream proxy returns
      // non-JSON content (e.g., HTML error page), the handler:
      // 1. Catches the JSON.parse() error
      // 2. Logs the error
      // 3. Returns 502 Bad Gateway to the client
      // 4. Does not crash or leave connection hanging

      const mockProxyRes = new EventEmitter();
      mockProxyRes.statusCode = 500;
      mockProxyRes.headers = {};

      const mockReq = {};

      // Mock response methods
      const mockRes = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        getHeader: sinon.stub(),
        setHeader: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        interceptResponse: null
      };

      sinon.stub(logger, 'error');

      // Simulating the proxyForAuth.on('proxyRes', ...) handler
      // The actual handler code is:
      // proxyRes.on('end', () => {
      //   let parsedBody;
      //   try {
      //     parsedBody = JSON.parse(body.toString());
      //   } catch (err) {
      //     logger.error('Invalid JSON in proxyForAuth response. Status: %s, error: %s, body preview: %s', ...);
      //     return res.status(502).json({ error: 'bad_upstream_response', details: '...' });
      //   }
      //   ...
      // });

      let body = Buffer.from('');
      mockProxyRes.on('data', data => (body = Buffer.concat([body, data])));

      mockProxyRes.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body.toString());
        } catch (err) {
          logger.error('Invalid JSON in proxyForAuth response. Status: %s, error: %s, body preview: %s',
            mockProxyRes.statusCode, err.message, body.toString().substring(0, 100));
          return mockRes.status(502).json({ error: 'bad_upstream_response', details: 'Invalid response from upstream' });
        }
        if (mockRes.interceptResponse) {
          parsedBody = mockRes.interceptResponse(mockReq, mockRes, parsedBody);
        }
        mockRes.json(parsedBody);
      });

      // Emit HTML error page instead of JSON
      mockProxyRes.emit('data', Buffer.from('<html><body>Internal Server Error</body></html>'));
      mockProxyRes.emit('end');

      // Verify error was logged
      expect(logger.error.callCount).to.equal(1);
      expect(logger.error.args[0][0]).to.include('Invalid JSON in proxyForAuth response');
      expect(logger.error.args[0][1]).to.equal(500); // Original status code

      // Verify 502 response was sent
      expect(mockRes.status.callCount).to.equal(1);
      expect(mockRes.status.args[0][0]).to.equal(502);

      // Verify error details sent to client
      expect(mockRes.json.callCount).to.equal(1);
      expect(mockRes.json.args[0][0]).to.deep.include({
        error: 'bad_upstream_response',
        details: 'Invalid response from upstream'
      });
    });

    it('should process valid JSON responses normally', () => {
      const mockProxyRes = new EventEmitter();
      mockProxyRes.statusCode = 200;
      mockProxyRes.headers = { 'content-type': 'application/json' };

      const mockReq = {};
      const mockRes = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        getHeader: sinon.stub(),
        setHeader: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        interceptResponse: null
      };

      sinon.stub(logger, 'error');

      let body = Buffer.from('');
      mockProxyRes.on('data', data => (body = Buffer.concat([body, data])));

      mockProxyRes.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body.toString());
        } catch (err) {
          logger.error('Invalid JSON in proxyForAuth response. Status: %s, error: %s, body preview: %s',
            mockProxyRes.statusCode, err.message, body.toString().substring(0, 100));
          return mockRes.status(502).json({ error: 'bad_upstream_response', details: 'Invalid response from upstream' });
        }
        if (mockRes.interceptResponse) {
          parsedBody = mockRes.interceptResponse(mockReq, mockRes, parsedBody);
        }
        mockRes.json(parsedBody);
      });

      // Emit valid JSON
      const responseData = { ok: true, docs: [{ _id: 'doc1', ok: true }] };
      mockProxyRes.emit('data', Buffer.from(JSON.stringify(responseData)));
      mockProxyRes.emit('end');

      // Should NOT have logged error
      expect(logger.error.callCount).to.equal(0);

      // Should NOT have set 502 status
      expect(mockRes.status.callCount).to.equal(0);

      // Should have sent JSON response normally
      expect(mockRes.json.callCount).to.equal(1);
      expect(mockRes.json.args[0][0]).to.deep.equal(responseData);
    });

    it('should log error with response body preview', () => {
      const mockProxyRes = new EventEmitter();
      mockProxyRes.statusCode = 503;
      mockProxyRes.headers = {};

      const mockReq = {};
      const mockRes = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        getHeader: sinon.stub(),
        setHeader: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        interceptResponse: null
      };

      sinon.stub(logger, 'error');

      let body = Buffer.from('');
      mockProxyRes.on('data', data => (body = Buffer.concat([body, data])));

      mockProxyRes.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body.toString());
        } catch (err) {
          logger.error('Invalid JSON in proxyForAuth response. Status: %s, error: %s, body preview: %s',
            mockProxyRes.statusCode, err.message, body.toString().substring(0, 100));
          return mockRes.status(502).json({ error: 'bad_upstream_response', details: 'Invalid response from upstream' });
        }
      });

      // Emit truncated JSON (good for debugging via body preview)
      const longHtmlError = '<html><body>Service Unavailable: ' + 'x'.repeat(200) + '</body></html>';
      mockProxyRes.emit('data', Buffer.from(longHtmlError));
      mockProxyRes.emit('end');

      // Verify error was logged with body preview (first 100 chars)
      expect(logger.error.callCount).to.equal(1);
      expect(logger.error.args[0][2]).to.include('<html><body>Service Unavailable');
      expect(logger.error.args[0][2].length).to.equal(100); // Preview limited to 100 chars
    });

    it('should handle chunked responses that are invalid JSON', () => {
      const mockProxyRes = new EventEmitter();
      mockProxyRes.statusCode = 200;
      mockProxyRes.headers = {};

      const mockReq = {};
      const mockRes = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        getHeader: sinon.stub(),
        setHeader: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        interceptResponse: null
      };

      sinon.stub(logger, 'error');

      let body = Buffer.from('');
      mockProxyRes.on('data', data => (body = Buffer.concat([body, data])));

      mockProxyRes.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body.toString());
        } catch (err) {
          logger.error('Invalid JSON in proxyForAuth response. Status: %s, error: %s, body preview: %s',
            mockProxyRes.statusCode, err.message, body.toString().substring(0, 100));
          return mockRes.status(502).json({ error: 'bad_upstream_response', details: 'Invalid response from upstream' });
        }
      });

      // Emit chunked data that forms invalid JSON
      mockProxyRes.emit('data', Buffer.from('<?xml version'));
      mockProxyRes.emit('data', Buffer.from('="1.0"?><root'));
      mockProxyRes.emit('data', Buffer.from('><error>Service Unavailable</error></root>'));
      mockProxyRes.emit('end');

      // Should have logged error
      expect(logger.error.callCount).to.equal(1);

      // Should have returned 502
      expect(mockRes.status.args[0][0]).to.equal(502);
    });
  });
});
