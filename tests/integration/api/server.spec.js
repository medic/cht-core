const utils = require('@utils');
const request = require('request');
const constants = require('@constants');
const _ = require('lodash');

describe('server', () => {
  describe('JSON-only endpoints', () => {
    it('should require application/json Content-Type header', () => {
      const opts = {
        method: 'POST',
        path: '/login',
        json: false
      };

      return utils.requestOnTestDb(opts, true)
        .then(() => expect.fail('should have thrown'))
        .catch(e => {
          expect(e.responseBody).to.equal('Content-Type must be application/json');
        });
    });
  });

  describe('response compression', () => {
    const requestWrapper = (options) => {
      _.defaults(options, {
        auth: {
          sendImmediately: true,
          username: constants.USERNAME,
          password: constants.PASSWORD
        },
        method: 'GET',
        baseUrl: constants.BASE_URL + '/' + constants.DB_NAME,
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
        expect(res.headers['content-encoding']).to.equal('gzip');
        expect(res.headers['content-type']).to.equal('application/json');
      });
    });

    it('compresses proxied CouchDB application/json requests which send accept-encoding deflate headers', () => {
      const options = { uri: '/_all_docs', gzip: false, headers: { 'Accept-Encoding': 'deflate' } };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers['content-encoding']).to.equal('deflate');
        expect(res.headers['content-type']).to.equal('application/json');
      });
    });

    it('does not compress when no accept-encoding headers are sent', () => {
      const options = { uri: '/_all_docs', gzip: false };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers['content-type']).to.equal('application/json');
        expect(res.headers['content-encoding']).to.be.undefined;
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
        expect(res.headers['content-type']).to.equal('application/json');
        expect(res.headers['content-encoding']).to.equal('gzip');
        expect(body.length).to.equal(18);
        expect(_.omit(body[0], 'rev')).to.eql({ id: 'sample_doc', ok: true });
        expect(_.omit(body[1], 'rev')).to.eql({ id: 'sample_doc2', ok: true });
        expect(_.omit(body[2], 'rev')).to.eql({ id: 'sample_doc3', ok: true });
      });
    });

    it('compresses compressible CouchDB doc attachments (text/plain)', () => {
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
        .then(({body}) => {
          const options = { uri: '/sample_doc/attach?rev=' + body.rev};

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          expect(res.headers['content-type']).to.equal('text/plain');
          expect(res.headers['content-encoding']).to.equal('gzip');
          expect(body).to.equal('my-attachment-content');
        });
    });

    it('compresses compressible CouchDB doc attachments (application/xml)', () => {
      const xml = '<contact><_id>689960f3-edc2-429b-92f7-96799b3db7d5</_id><patient_id>40599</patient_id>' +
                  '<name>Person 1.1.2.1</name><date_of_birth /><sex /><parent><contact><phone />' +
                  '<name>Person 1.1.2.1</name></contact></parent></contact>';
      return utils
        .getDoc('sample_doc2')
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
          expect(res.headers['content-type']).to.equal('application/xml');
          expect(res.headers['content-encoding']).to.equal('gzip');
          expect(body).to.equal(xml);
        });
    });

    it('does not compress uncompressible CouchDB doc attachments (image/png)', async () => {
      const png = '<contact><_id>689960f3-edc2-429b-92f7-96799b3db7d5</_id><patient_id>40599</patient_id>' +
                  '<name>Person 1.1.2.1</name><date_of_birth /><sex /><parent><contact><phone />' +
                  '<name>Person 1.1.2.1</name></contact></parent></contact>';
      const doc = await utils.getDoc('sample_doc2');
      const options = {
        uri: '/sample_doc2/attach?rev='+doc._rev,
        body: png,
        headers: { 'Content-Type': 'image/png' },
        method: 'PUT'
      };
      const { body } = await requestWrapper(options);
      const getAttachmentOptions = { uri: '/sample_doc2/attach?rev=' + body.rev };
      const { res, body: attachmentBody } = await requestWrapper(getAttachmentOptions);
      expect(res.headers[ 'content-type' ]).to.equal('image/png');
      expect(res.headers[ 'content-encoding' ]).to.be.undefined;
      expect(attachmentBody).to.equal(png);
    });
  });

  describe('API changes feed', () => {
    it('should respond to changes even after services are restarted', async () => {
      await utils.stopHaproxy(); // this will also crash API
      await utils.startHaproxy();
      await utils.listenForApi();
      await utils.delayPromise(1000);

      const forms = await utils.db.allDocs({
        start_key: 'form:',
        end_key: 'form:\ufff0',
        include_docs: true,
        limit: 1,
      });
      const formDoc = forms.rows[0].doc;
      delete formDoc._attachments['form.html'];
      delete formDoc._attachments['model.xml'];
      await utils.saveDoc(formDoc);
      const updatedFormDoc = await utils.getDoc(formDoc._id);
      expect(updatedFormDoc._attachments).to.have.keys(['xml', 'form.html', 'model.xml']);
    });
  });

  describe('DNS resolver', () => {
    it('nginx should resolve updated api ips', async () => {
      await utils.stopHaproxy();
      await utils.stopApi();
      await utils.startHaproxy();
      await utils.startApi();
      await utils.delayPromise(1000);

      await utils.request('/');

      await utils.stopHaproxy();
      await utils.stopApi();
      await utils.startApi(false);
      await utils.startHaproxy();

      await utils.listenForApi();
      await utils.delayPromise(1000);
    });
  });
});
