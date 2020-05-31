const assert = require('chai').assert;
const sinon = require('sinon');
const rewire = require('rewire');
const secureSettings = require('@medic/settings');
const request = require('request-promise-native');
const outbound = rewire('../src/outbound');

describe('outbound shared library', () => {
  afterEach(() => sinon.restore());

  // This has to run before any describes even though it's only used by the service describe block
  // so the logger gets attached
  const service = outbound({... console, isDebugEnabled: () => false});

  describe('send', () => {
    let restores;
    let mapDocumentToPayload;
    let sendPayload;

    beforeEach(() => {
      restores = [];

      mapDocumentToPayload = sinon.stub();
      restores.push(outbound.__set__('mapDocumentToPayload', mapDocumentToPayload));

      sendPayload = sinon.stub();
      restores.push(outbound.__set__('sendPayload', sendPayload));
    });

    afterEach(() => restores.forEach(restore => restore()));

    const config = {some: 'config'};
    const configName = 'someConfig';
    const record = {some: 'record'};
    const recordInfo = {some: 'recordInfo'};
    const payload = {some: 'payload'};

    const error = {oh: 'no'};

    it('Maps and sends', () => {
      mapDocumentToPayload.resolves(payload);
      sendPayload.resolves();

      return service.send(config, configName, record, recordInfo)
        .then(() => {
          assert.equal(mapDocumentToPayload.callCount, 1);
          assert.equal(sendPayload.callCount, 1);

          assert.deepEqual(mapDocumentToPayload.args[0], [record, config, configName]);
          assert.deepEqual(sendPayload.args[0], [payload, config]);
        });
    });

    it('Propagates a mapping error', () => {
      mapDocumentToPayload.rejects(error);

      return service.send(config, configName, record)
        .catch(err => err)
        .then(err => {
          assert.equal(mapDocumentToPayload.callCount, 1);
          assert.equal(sendPayload.callCount, 0);

          assert.deepEqual(err, error);
        });
    });

    it('Propagates a sending error', () => {
      mapDocumentToPayload.resolves(payload);
      sendPayload.rejects(error);

      return service.send(config, configName, record)
        .catch(err => err)
        .then(err => {
          assert.equal(mapDocumentToPayload.callCount, 1);
          assert.equal(sendPayload.callCount, 1);

          assert.deepEqual(err, error);
        });
    });
  });

  describe('mapDocumentToPayload', () => {
    const mapDocumentToPayload = outbound.__get__('mapDocumentToPayload');

    it('supports simple dest => src mapping', () => {
      const doc = {
        _id: 'test-doc',
        foo: 42,
        bar: 'baaa'
      };

      const conf = {
        mapping: {
          'api_foo': 'doc.foo',
          'bar': 'doc.bar'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        api_foo: 42,
        bar: 'baaa'
      });
    });

    it('supports deep dest => src mapping', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          foo: 'baaaaa'
        }
      };

      const conf = {
        mapping: {
          'when': 'doc.reported_date',
          'data.the_foo': 'doc.fields.foo'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        when: 42,
        data: {
          the_foo: 'baaaaa'
        }
      });
    });

    it('errors if src path does not exist', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          not_foo: 'baaaaa'
        }
      };

      const conf = {
        mapping: {
          'foo': 'doc.fields.foo'
        }
      };

      assert.throws(() => mapDocumentToPayload(doc, conf, 'test-config'), `Mapping error for 'test-config/foo' on ` +
        `source document 'test-doc': cannot find 'doc.fields.foo' on source document`);
    });

    it('supports optional path mappings', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          not_foo: 'baaaaa',
          bar: 42
        }
      };

      const conf = {
        mapping: {
          foo: {
            path: 'doc.fields.foo',
            optional: true
          },
          bar: 'doc.fields.bar'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        bar: 42
      });
    });

    it('supports basic awkward data conversion via arbitrary expressions', () => {
      const doc = {
        _id: 'test-doc',
        fields: {
          a_list: ['a', 'b', 'c', 'd'],
          foo: 'No',
        }
      };

      const conf = {
        mapping: {
          list_count: {expr: 'doc.fields.a_list.length'},
          foo: {expr: 'doc.fields.foo === \'Yes\''},
        }
      };
      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        list_count: 4,
        foo: false
      });
    });

    it('throws a useful exception if the expression errors', () => {
      const doc = {
        _id: 'test-doc',
      };

      const conf = {
        mapping: {
          is_gonna_fail: {expr: 'doc.fields.null.pointer'},
        }
      };

      assert.throws(() => mapDocumentToPayload(doc, conf, 'test-doc'), /Mapping error/);
    });
  });

  describe('updateInfo', () => {
    it('Updates a passed infodoc with completion information', () => {
      const info = {
        _id: 'some-info',
        completed_tasks: []
      };

      outbound.__get__('updateInfo')(info, 'test-config');

      assert.equal(info.completed_tasks.length, 1);
      assert.equal(info.completed_tasks[0].type, 'outbound');
      assert.equal(info.completed_tasks[0].name, 'test-config');
      assert.isAbove(info.completed_tasks[0].timestamp, 0);
    });
    it('Even if that infodoc has no prior completed tasks', () => {
      const info = {
        _id: 'some-info',
      };

      outbound.__get__('updateInfo')(info, 'test-config');

      assert.equal(info.completed_tasks.length, 1);
      assert.equal(info.completed_tasks[0].type, 'outbound');
      assert.equal(info.completed_tasks[0].name, 'test-config');
      assert.isAbove(info.completed_tasks[0].timestamp, 0);
    });
  });

  describe('push', () => {
    it('should push on minimal configuration', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(request, 'post').resolves();

      return outbound.__get__('sendPayload')(payload, conf)
        .then(() => {
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
        });
    });

    it('should support pushing via basic auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'Basic',
            username: 'admin',
            password_key: 'test-config'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('pass');
      sinon.stub(request, 'post').resolves();

      return outbound.__get__('sendPayload')(payload, conf)
        .then(() => {
          assert.equal(secureSettings.getCredentials.callCount, 1);
          assert.equal(secureSettings.getCredentials.args[0][0], 'test-config');
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
          assert.deepEqual(request.post.args[0][0].auth, {
            username: 'admin',
            password: 'pass',
            sendImmediately: true
          });
        });
    });

    it('should support pushing via header auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'Header',
            name: 'Authorization',
            value_key: 'test-config'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('Bearer credentials');
      sinon.stub(request, 'post').resolves();

      return outbound.__get__('sendPayload')(payload, conf)
        .then(() => {
          assert.equal(secureSettings.getCredentials.callCount, 1);
          assert.equal(secureSettings.getCredentials.args[0][0], 'test-config');
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
          assert.deepEqual(request.post.args[0][0].headers, {
            Authorization: 'Bearer credentials'
          });
        });
    });

    it('should support Muso SIH custom auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'muso-sih',
            username: 'admin',
            password_key: 'test-config',
            path: '/login'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('pass');
      const post = sinon.stub(request, 'post');

      post.onCall(0).resolves({
        statut: 200,
        message: 'Requête traitée avec succès.',
        data: {
          username_token: 'j9NAhVDdVWkgo1xnbxA9V3Pmp'
        }
      });
      post.onCall(1).resolves();

      return outbound.__get__('sendPayload')(payload, conf)
        .then(() => {
          assert.equal(post.callCount, 2);

          assert.equal(post.args[0][0].form.login, 'admin');
          assert.equal(post.args[0][0].form.password, 'pass');
          assert.equal(post.args[0][0].url, 'http://test/login');

          assert.equal(post.args[1][0].url, 'http://test/foo');
          assert.deepEqual(post.args[1][0].body, {some: 'data'});
          assert.equal(post.args[1][0].json, true);
          assert.equal(post.args[1][0].qs.token, 'j9NAhVDdVWkgo1xnbxA9V3Pmp');
        });
    });

    it('should error if Muso SIH custom auth fails to return a 200', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'muso-sih',
            username: 'admin',
            password_key: 'test-config',
            path: '/login'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('wrong pass');

      sinon.stub(request, 'post').resolves({
        statut: 404,
        message: 'Login/Mot de passe Incorrect !'
      });

      return outbound.__get__('sendPayload')(payload, conf)
        .then(() => {
          assert.fail('This send should have errored');
        })
        .catch(err => {
          assert.equal(err.message, 'Got 404 when requesting auth');
        });
    });
  });

  describe('alreadySent', () => {
    it('returns false if this record has never been sent anywhere before', () => {
      assert.isNotOk(service.alreadySent('foo', {_id: 'some-record-info'}));
    });

    it('returns false if this record has been sent outbound before, but not for this configuration', () => {
      assert.isNotOk(service.alreadySent('foo', {
        _id: 'some-record-info',
        completed_tasks: [{
          type: 'outbound',
          name: 'bar',
          timestamp: Date.now()
        }]
      }));
    });

    it('returns true if this record has been sent outbound before, for this configuration', () => {
      assert.isOk(service.alreadySent('foo', {
        _id: 'some-record-info',
        completed_tasks: [{
          type: 'outbound',
          name: 'bar',
          timestamp: Date.now()
        }, {
          type: 'outbound',
          name: 'foo',
          timestamp: Date.now()
        }]
      }));
    });
  });
});
