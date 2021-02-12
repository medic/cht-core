const utils = require('../../utils');
const auth = require('../../auth')();
const request = require('request');
const constants = require('../../constants');
const _ = require('lodash');
const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

describe('server', () => {
  describe('JSON-only endpoints', () => {
    it('should require application/json Content-Type header', () => {
      const opts = {
        method: 'POST',
        path: '/login',
        json: false
      };

      return utils.requestOnTestDb(opts, true)
        .then(fail)
        .catch(e => {
          chai.expect(e.responseBody).to.equal('Content-Type must be application/json');
        });
    });
  });

  describe('response compression', () => {
    afterAll(utils.afterEachNative);

    const requestWrapper = (options) => {
      _.defaults(options, {
        auth: Object.assign({ sendImmediately: true }, auth),
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
            } catch (err) {
              // an error occured when trying parse 'body' to Object
            }
          }

          resolve({ res, body });
        });
      });
    };

    it('compresses proxied CouchDB application/json requests which send accept-encoding gzip headers', () => {
      const options = { uri: '/_all_docs' };

      return requestWrapper(options).then(({res}) => {
        chai.expect(res.headers['content-encoding']).to.equal('gzip');
        chai.expect(res.headers['content-type']).to.equal('application/json');
      });
    });

    it('compresses proxied CouchDB application/json requests which send accept-encoding deflate headers', () => {
      const options = { uri: '/_all_docs', gzip: false, headers: { 'Accept-Encoding': 'deflate' } };

      return requestWrapper(options).then(({res}) => {
        chai.expect(res.headers['content-encoding']).to.equal('deflate');
        chai.expect(res.headers['content-type']).to.equal('application/json');
      });
    });

    it('does not compress when no accept-encoding headers are sent', () => {
      const options = { uri: '/_all_docs', gzip: false };

      return requestWrapper(options).then(({res}) => {
        chai.expect(res.headers['content-type']).to.equal('application/json');
        chai.expect(res.headers['content-encoding']).to.not.be.ok;
      });
    });

    it('compresses audited endpoints responses', () => {
      // compression threshold is 1024B
      const options = {
        uri: '/_bulk_docs',
        method: 'POST',
        json: true,
        body: {
          docs: [
            { _id: 'sample_doc' }, { _id: 'sample_doc2' }, { _id: 'sample_doc3' },
            { _id: 'sample_doc4' }, { _id: 'sample_doc5' }, { _id: 'sample_doc6' },
            { _id: 'sample_doc7' }, { _id: 'sample_doc8' }, { _id: 'sample_doc9' },
            { _id: 'sample_doc7' }, { _id: 'sample_doc8' }, { _id: 'sample_doc9' },
            { _id: 'sample_doc7' }, { _id: 'sample_doc8' }, { _id: 'sample_doc9' },
            { _id: 'sample_doc7' }, { _id: 'sample_doc8' }, { _id: 'sample_doc9' },
          ]
        }
      };

      return requestWrapper(options).then(({res, body}) => {
        chai.expect(res.headers['content-type']).to.equal('application/json');
        chai.expect(res.headers['content-encoding']).to.equal('gzip');
        chai.expect(body.length).to.equal(18);
        chai.expect(body[0]).excluding('rev').to.deep.equal({ id: 'sample_doc', ok: true });
        chai.expect(body[1]).excluding('rev').to.deep.equal({ id: 'sample_doc2', ok: true });
        chai.expect(body[2]).excluding('rev').to.deep.equal({ id: 'sample_doc3', ok: true });
      });
    });

    it('compresses compressible CouchDB doc attachments (text/plain)', () => {
      return utils
        .getDocNative('sample_doc')
        .then(doc => {
          const options = {
            uri: '/sample_doc/attach?rev=' + doc._rev,
            body: 'my-attachment-content',
            headers: { 'Content-Type': 'text/plain' },
            method: 'PUT'
          };

          return requestWrapper(options);
        })
        .then(({body}) => {
          const options = { uri: '/sample_doc/attach?rev=' + body.rev};

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          chai.expect(res.headers['content-type']).to.equal('text/plain');
          chai.expect(res.headers['content-encoding']).to.equal('gzip');
          chai.expect(body).to.equal('my-attachment-content');
        });
    });

    it('compresses compressible CouchDB doc attachments (application/xml)', () => {
      const xml = '<contact><_id>689960f3-edc2-429b-92f7-96799b3db7d5</_id><patient_id>40599</patient_id>' +
                  '<name>Person 1.1.2.1</name><date_of_birth /><sex /><parent><contact><phone />' +
                  '<name>Person 1.1.2.1</name></contact></parent></contact>';
      return utils
        .getDocNative('sample_doc2')
        .then(doc => {
          const options = {
            uri: '/sample_doc2/attach?rev=' + doc._rev,
            body: xml,
            headers: { 'Content-Type': 'application/xml' },
            method: 'PUT'
          };

          return requestWrapper(options);
        })
        .then(({body}) => {
          const options = { uri: '/sample_doc2/attach?rev=' + body.rev};

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          chai.expect(res.headers['content-type']).to.equal('application/xml');
          chai.expect(res.headers['content-encoding']).to.equal('gzip');
          chai.expect(body).to.equal(xml);
        });
    });

    it('does not compress uncompressible CouchDB doc attachments (image/png)', () => {
      const png = '<contact><_id>689960f3-edc2-429b-92f7-96799b3db7d5</_id><patient_id>40599</patient_id>' +
                  '<name>Person 1.1.2.1</name><date_of_birth /><sex /><parent><contact><phone />' +
                  '<name>Person 1.1.2.1</name></contact></parent></contact>';
      return utils
        .getDocNative('sample_doc2')
        .then(doc => {
          const options = {
            uri: '/sample_doc2/attach?rev=' + doc._rev,
            body: png,
            headers: { 'Content-Type': 'image/png' },
            method: 'PUT'
          };

          return requestWrapper(options);
        })
        .then(({body}) => {
          const options = { uri: '/sample_doc2/attach?rev=' + body.rev};

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          chai.expect(res.headers['content-type']).to.equal('image/png');
          chai.expect(res.headers['content-encoding']).to.not.be.ok;
          chai.expect(body).to.equal(png);
        });
    });
  });
});
