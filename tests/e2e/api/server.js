const utils = require('../../utils'),
      auth = require('../../auth')(),
      request = require('request'),
      constants = require('../../constants'),
      _ = require('underscore');

describe('server', () => {
  describe('JSON-only endpoints', () => {
    it('should require application/json Content-Type header', () => {
      const opts = {
        method: 'POST',
        path: '/login',
        body: {}
      };

      return utils.requestOnTestDb(opts, true)
        .then(fail)
        .catch(e => {
          expect(e.responseBody).toBe('Content-Type must be application/json');
        });
    });
  });

  describe('response compression', () => {
    afterAll(() => utils.revertDb());

    const requestWrapper = (options) => {
      _.defaults(options, {
        auth: _.extend({ sendImmediately: true }, auth),
        method: 'GET',
        baseUrl: 'http://' + constants.API_HOST + ':' + constants.API_PORT + '/' + constants.DB_NAME,
        uri: '/',
        gzip: true
      });

      return new Promise((resolve, reject) => {
        request(options, (err, res, body) => {
          if (err) {
            return reject(err);
          }

          if (res.headers['content-type'] === 'application/json' && typeof body === 'string') {
            try {
              body = JSON.parse(body);
            } catch (err) {}
          }

          resolve({ res, body });
        });
      });
    };

    it('compresses proxied CouchDB application/json requests which send accept-encoding headers', () => {
      const options = { uri: '/_all_docs' };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers['content-encoding']).toEqual('gzip');
        expect(res.headers['content-type']).toEqual('application/json');
      });
    });

    it('does not compress when no accept-encoding headers are sent', () => {
      const options = { uri: '/_all_docs', gzip: false };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers['content-type']).toEqual('application/json');
        expect(res.headers['content-encoding']).toBeFalsy();
      });
    });

    it('compresses audited endpoints responses', () => {
      const options = {
        uri: '/_bulk_docs',
        method: 'POST',
        json: true,
        body: { docs: [{ _id: 'sample_doc' }]}
      };

      return requestWrapper(options).then(({res, body}) => {
        expect(res.headers['content-type']).toEqual('application/json');
        expect(res.headers['content-encoding']).toEqual('gzip');
        expect(body.length).toEqual(1);
        expect(_.omit(body[0], 'rev')).toEqual({ id: 'sample_doc', ok: true });
      });
    });

    it('compresses compressible CouchDB doc attachments', () => {
      return utils
        .getDoc('sample_doc')
        .then(doc => {
          const options = {
            uri: '/sample_doc/attach?rev=' + doc._rev,
            body: 'my-attachment-content',
            headers: { 'Content-Type': 'text/plain' },
            method: 'PUT'
          };

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          const options = { uri: '/sample_doc/attach?rev=' + body.rev};

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          expect(res.headers['content-type']).toEqual('text/plain');
          expect(res.headers['content-encoding']).toEqual('gzip');
          expect(body).toEqual('my-attachment-content');
        });
    });
  });
});
