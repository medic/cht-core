const utils = require('@utils');
const constants = require('@constants');
const _ = require('lodash');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

describe('server', () => {
  describe('JSON-only endpoints', () => {
    it('should require application/json Content-Type header', () => {
      const opts = {
        method: 'POST',
        path: '/login',
        json: false
      };

      return utils.requestOnTestDb(opts)
        .then(() => expect.fail('should have thrown'))
        .catch(e => {
          expect(e.body).to.equal('Content-Type must be application/json');
        });
    });
  });

  describe('response compression', () => {
    const requestWrapper = async (options) => {
      const opts =  { path: '/', gzip: true, resolveWithFullResponse: true, ...options };

      const res = await utils.request(opts);
      return { res, body: res.body };
    };

    it('compresses proxied CouchDB application/json requests which send accept-encoding gzip headers', () => {
      const options = { path: '/medic/_all_docs' };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers.get('content-encoding')).to.equal('gzip');
        expect(res.headers.get('content-type')).to.equal('application/json');
      });
    });

    it('compresses proxied CouchDB application/json requests which send accept-encoding deflate headers', () => {
      const options = {
        path: '/medic/_all_docs',
        gzip: false,
        headers: { 'Accept-Encoding': 'deflate' }
      };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers.get('content-encoding')).to.equal('deflate');
        expect(res.headers.get('content-type')).to.equal('application/json');
      });
    });

    it('does not compress when no accept-encoding headers are sent', () => {
      const options = {
        path: '/medic/_all_docs',
        gzip: false
      };

      return requestWrapper(options).then(({res}) => {
        expect(res.headers.get('content-type')).to.equal('application/json');
        expect(res.headers.get('content-encoding')).to.be.null;
      });
    });

    it('compresses audited endpoints responses', () => {
      // compression threshold is 1024B
      const options = {
        path: '/medic/_bulk_docs',
        method: 'POST',
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
        expect(res.headers.get('content-type')).to.equal('application/json; charset=utf-8');
        expect(res.headers.get('content-encoding')).to.equal('gzip');
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
            path: '/medic/sample_doc/attach',
            body: 'my-attachment-content',
            headers: { 'Content-Type': 'text/plain' },
            method: 'PUT',
            json: false,
            qs: { rev: doc._rev }
          };

          return requestWrapper(options);
        })
        .then(({body}) => {
          const options = {
            path: '/medic//sample_doc/attach',
            json: false,
            qs: { rev: body.rev }
          };

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          expect(res.headers.get('content-type')).to.equal('text/plain');
          expect(res.headers.get('content-encoding')).to.equal('gzip');
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
            path: '/medic/sample_doc2/attach',
            body: xml,
            json: false,
            headers: { 'Content-Type': 'application/xml' },
            method: 'PUT',
            qs: { rev: doc._rev }
          };

          return requestWrapper(options);
        })
        .then(({body}) => {
          const options = {
            path: '/medic/sample_doc2/attach',
            qs: { rev: body.rev }
          };

          return requestWrapper(options);
        })
        .then(({res, body}) => {
          expect(res.headers.get('content-type')).to.equal('application/xml');
          expect(res.headers.get('content-encoding')).to.equal('gzip');
          expect(body).to.equal(xml);
        });
    });

    it('does not compress uncompressible CouchDB doc attachments (image/png)', async () => {
      const png = '<contact><_id>689960f3-edc2-429b-92f7-96799b3db7d5</_id><patient_id>40599</patient_id>' +
                  '<name>Person 1.1.2.1</name><date_of_birth /><sex /><parent><contact><phone />' +
                  '<name>Person 1.1.2.1</name></contact></parent></contact>';
      const doc = await utils.getDoc('sample_doc2');
      const options = {
        path: '/medic/sample_doc2/attach',
        body: png,
        headers: { 'Content-Type': 'image/png' },
        method: 'PUT',
        qs: { rev: doc._rev },
      };
      const { body } = await requestWrapper(options);
      const getAttachmentOptions = {
        path: '/medic/sample_doc2/attach',
        qs: { rev: body.rev },
        json: false,
      };
      const { res, body: attachmentBody } = await requestWrapper(getAttachmentOptions);
      expect(res.headers.get('content-type')).to.equal('image/png');
      expect(res.headers.get('content-encoding')).to.be.null;
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
      await utils.delayPromise(1000);

      await utils.listenForApi();
      await utils.delayPromise(1000);
    });

    it('should work after restarting CouchDb @docker', async () => {
      await utils.stopCouchDb();
      await utils.startCouchDb();

      await utils.listenForApi();
      await utils.delayPromise(1000);
    });
  });

  describe('Request ID propagated to haproxy', () => {
    const ID_REGEX = /[,|\s]([0-9a-f]{12})[,|\s]/;

    const getReqId = (logLine) => {
      if (ID_REGEX.test(logLine)) {
        const match = logLine.match(ID_REGEX);
        return match?.[1];
      }
    };

    describe('for online users', () => {
      it('should propagate ID via proxy', async () => {
        const collectApiLogs = await utils.collectApiLogs(/\/_all_docs\?limit=1/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/\/_all_docs\?limit=1/);

        const result = await utils.request('/medic/_all_docs?limit=1');
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        expect(result.rows.length).to.equal(1);
        expect(apiLogs.length).to.equal(2);
        const apiReqId = getReqId(apiLogs[0]);
        const haproxyReqId = getReqId(haproxyLogs[0]);

        expect(apiReqId.length).to.equal(12);
        expect(haproxyReqId).to.equal(apiReqId);
      });

      it('should propagate ID via PouchDb', async () => {
        const collectApiLogs = await utils.collectApiLogs(/hydrate/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        const result = await utils.request({ path: '/api/v1/hydrate', qs: { doc_ids: [constants.USER_CONTACT_ID] }});
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        expect(result.length).to.equal(1);
        const reqID = getReqId(apiLogs[0]);

        const haproxyRequests = haproxyLogs.filter(entry => getReqId(entry) === reqID);
        expect(haproxyRequests.length).to.equal(2);
        expect(haproxyRequests[0]).to.include('_session');
        expect(haproxyRequests[1]).to.include('_design/medic-client/_view/docs_by_id_lineage');
      });

      it('should propagate ID via couch-request', async () => {
        const collectApiLogs = await utils.collectApiLogs(/couch-config-attachments/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        await utils.request({ path: '/api/couch-config-attachments' });
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        const reqID = getReqId(apiLogs[0]);

        const haproxyRequests = haproxyLogs.filter(entry => getReqId(entry) === reqID);
        expect(haproxyRequests.length).to.equal(3);
        expect(haproxyRequests[0]).to.include('_session');
        expect(haproxyRequests[1]).to.include('_session');
        expect(haproxyRequests[2]).to.include('/_node/_local/_config/attachments');
      });

      it('should use a different id for different requests', async () => {
        const collectApiLogs = await utils.collectApiLogs(/.*/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        await utils.request({ path: '/api/couch-config-attachments' });
        await utils.request({ path: '/api/v1/hydrate', qs: { doc_ids: [constants.USER_CONTACT_ID] }});

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        const configReqId = apiLogs
          .filter(log => log.includes('couch-config-attachments'))
          .map((log) => getReqId(log))[0];
        const hydrateReqId = apiLogs
          .filter(log => log.includes('hydrate'))
          .map((log) => getReqId(log))[0];

        const haproxyConfigReqs = haproxyLogs.filter(entry => getReqId(entry) === configReqId);
        expect(haproxyConfigReqs.length).to.equal(3);

        const haproxyHydrateReqs = haproxyLogs.filter(entry => getReqId(entry) === hydrateReqId);
        expect(haproxyHydrateReqs.length).to.equal(2);

        expect(hydrateReqId).not.to.equal(configReqId);
      });
    });

    describe('for offline users', () => {
      let reqOptions;
      let offlineUser;
      before(async () => {
        const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
        const contact = utils.deepFreeze(personFactory.build({ name: 'contact', role: 'chw' }));
        const place = utils.deepFreeze({ ...placeMap.get('clinic'), contact: { _id: contact._id } });
        offlineUser = utils.deepFreeze(userFactory.build({
          username: 'offline-user-id',
          place: place._id,
          contact: {
            _id: 'fixture:user:offline',
            name: 'Offline User',
          },
          roles: ['chw']
        }));

        await utils.saveDocs([contact, ...placeMap.values()]);
        await utils.createUsers([offlineUser]);

        await utils.deletePurgeDbs();

        reqOptions = {
          auth: { username: offlineUser.username, password: offlineUser.password },
        };
      });

      it('should propagate ID via PouchDb requests', async () => {
        const collectApiLogs = await utils.collectApiLogs(/replication/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        await utils.request({ path: '/api/v1/initial-replication/get-ids', ...reqOptions });
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        const reqID = getReqId(apiLogs[0]);

        const haproxyRequests = haproxyLogs.filter(entry => getReqId(entry) === reqID);
        expect(haproxyRequests.length).to.equal(12);
        expect(haproxyRequests[0]).to.include('_session');
        expect(haproxyRequests[5]).to.include('/medic-test/_design/medic/_view/contacts_by_depth');
        expect(haproxyRequests[6]).to.include('/medic-test/_design/medic/_nouveau/docs_by_replication_key');
        expect(haproxyRequests[7]).to.include('/medic-test-purged-cache/purged-docs-');
        expect(haproxyRequests[8]).to.include('/medic-test-purged-role-');
        expect(haproxyRequests[9]).to.include('/medic-test-logs/replication-count-');
        expect(haproxyRequests[10]).to.include('/medic-test-logs/replication-count-');
        expect(haproxyRequests[11]).to.include('/medic-test/_all_docs');
      });

      it('should propagate ID via couch requests', async () => {
        const collectApiLogs = await utils.collectApiLogs(/meta/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        await utils.request({
          path: `/medic-user-${offlineUser.username}-meta/`,
          method: 'PUT',
          ...reqOptions,
        });
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        const reqID = getReqId(apiLogs[0]);

        const haproxyRequests = haproxyLogs.filter(entry => getReqId(entry) === reqID);
        expect(haproxyRequests.length).to.equal(7);
        expect(haproxyRequests[0]).to.include('_session');
        expect(haproxyRequests[1]).to.include('_session');
        expect(haproxyRequests[2]).to.include(`medic-test-user-${offlineUser.username}-meta`);
        expect(haproxyRequests[3]).to.include(`medic-test-user-${offlineUser.username}-meta`);
        expect(haproxyRequests[4]).to.include(`medic-test-user-${offlineUser.username}-meta`);
        expect(haproxyRequests[5]).to.include(`medic-test-user-${offlineUser.username}-meta/_design/medic-user`);
        expect(haproxyRequests[6]).to.include(`medic-test-user-${offlineUser.username}-meta/_security`);
      });

      it('should propagate ID via proxy', async () => {
        const collectApiLogs = await utils.collectApiLogs(/meta/);
        const collectHaproxyLogs = await utils.collectHaproxyLogs(/.*/);

        await utils.request({
          path: `/medic-user-${offlineUser.username}-meta/the_doc`,
          method: 'PUT',
          body: { _id: 'the_doc', value: true },
          ...reqOptions,
        });
        await utils.delayPromise(500); // wait for everything to get logged

        const apiLogs = (await collectApiLogs()).filter(log => log.length);
        const haproxyLogs = (await collectHaproxyLogs()).filter(log => log.length);

        const reqID = getReqId(apiLogs[0]);

        const haproxyRequests = haproxyLogs.filter(entry => getReqId(entry) === reqID);
        expect(haproxyRequests.length).to.equal(2);
        expect(haproxyRequests[0]).to.include('_session');
        expect(haproxyRequests[1]).to.include(`/medic-test-user-${offlineUser.username}-meta/the_doc`);
      });
    });

  });

  describe('api startup', () => {
    it('should start up with broken forms', async () => {
      const waitForLogs = await utils.waitForApiLogs(/Failed to update xform/);

      const formName = 'broken';
      const formDoc = {
        _id: `form:${formName}`,
        title: formName,
        type: 'form',
        _attachments: {
          xml: {
            content_type: 'application/octet-stream',
            data: btoa('this is totally not an xml'),
          },
        },
      };
      await utils.db.put(formDoc); // don't use utils.saveDoc because that actually waits for good forms
      await waitForLogs.promise;

      await utils.stopApi();
      await utils.startApi();
    }); 
  });
});
