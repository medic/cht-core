const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const rewire = require('rewire');

const environment = require('@medic/environment');

let lib;

describe('Audit', () => {
  let db;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers(1000);
    lib = rewire('../src/index');
    db = {
      allDocs: sinon.stub().resolves({ rows: [] }),
      bulkDocs: sinon.stub().resolves([]),
    };
    lib.__set__('db', db);

    sinon.stub(environment, 'db').get(() => 'medic');
    sinon.stub(environment, 'username').get(() => 'admin');
    sinon.stub(environment, 'getService').returns('api');
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  const getResponse = (ok, json, streamed, body) => {
    const response = {
      ok,
      json: sinon.stub().resolves(body),
      streamed,
      body: streamed ? null : body,
      headers: {
        get: sinon.stub().withArgs('content-type').returns(json ? 'application/json' : 'text/plain')
      }
    };
    response.clone = sinon.stub().returns(response);

    return response;
  };

  describe('fetchCallback', () => {
    it('should skip invalid requests', async () => {
      const response = getResponse(false, true, false, { ok: false, error: 'not_found' });
      await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'GET' }, response, {});

      expect(db.allDocs.callCount).to.equal(0);
      expect(db.bulkDocs.callCount).to.equal(0);
    });

    it('should skip non-json responses', async () => {
      const response = getResponse(true, false, false, 'text');
      await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'GET' }, response, {});

      expect(db.allDocs.callCount).to.equal(0);
      expect(db.bulkDocs.callCount).to.equal(0);
    });

    it('should skip non-write requests', async () => {
      const response = getResponse(true, true, false, { ok: true, id: 'a', rev: '1-a' });
      await lib.fetchCallback('http://localhost/medic/_all_docs', { method: 'GET' }, response, {});
      await lib.fetchCallback('http://localhost/medic/_all_docs', { method: 'POST' }, response, {});
      await lib.fetchCallback('http://localhost/medic/doc', { method: 'GET' }, response, {});
      await lib.fetchCallback('http://localhost/medic/_bulk_get', { method: 'POST' }, response, {});

      expect(db.allDocs.callCount).to.equal(0);
      expect(db.bulkDocs.callCount).to.equal(0);
    });

    it('should record audit on db-doc POST', async () => {
      const response = getResponse(true, true, false, { ok: true, id: 'doc', rev: '1-a' });
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.fetchCallback('http://localhost/medic/', { method: 'POST' }, response, { user: 'user', requestId: '123' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '123',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on db-doc PUT', async () => {
      const response = getResponse(true, true, false, { ok: true, id: 'doc', rev: '1-a' });
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.fetchCallback('http://localhost/medic/doc', { method: 'PUT' }, response, { user: 'user', requestId: '123' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '123',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on _bulk_docs', async () => {
      const response = getResponse(true, true, false, [{ ok: true, id: 'doc', rev: '1-a' }]);
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      const body = { docs: [{ _id: 'doc', _rev: '1-a' }], new_edits: true };
      await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'POST', body }, response, { user: 'user', requestId: '456' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on _bulk_docs with new_edits', async () => {
      const response = getResponse(true, true, false, [{ ok: true, id: 'doc', rev: '1-a' }]);
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      const body = JSON.stringify({ docs: [{ _id: 'doc', _rev: '1-a' }], new_edits: false });

      await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'POST', body }, response, { user: 'user', requestId: '456' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should handle streamed bodies', async () => {
      const response = getResponse(true, true, true, [{ ok: true, id: 'doc', rev: '1-a' }]);
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      const body = JSON.stringify({ docs: [{ _id: 'doc', _rev: '1-a' }], new_edits: false });

      await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'POST', body }, response, { user: 'user', requestId: '456' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });
  });

  describe('expressCallback', () => {
    const getRequest = (url, method, body) => {
      return {
        originalUrl: url,
        method,
        body,
      };
    };

    it('should skip non-write requests', async () => {
      await lib.expressCallback(getRequest('/medic/_bulk_docs', 'GET'), {}, {});
      await lib.expressCallback(getRequest('/medic/_all_docs', 'GET'), {}, {});
      await lib.expressCallback(getRequest('/medic/_all_docs', 'POST'), {}, {});
      await lib.expressCallback(getRequest('/medic', 'GET'), {}, {});
      await lib.expressCallback(getRequest('/medic/test', 'GET'), { ok: true, id: 'a', rev: '2-a' }, {});

      expect(db.allDocs.callCount).to.equal(0);
      expect(db.bulkDocs.callCount).to.equal(0);
    });

    it('should record audit on db-doc POST', async () => {
      const request = getRequest('/medic/', 'POST', { _id: 'doc', _rev: '1-a' });
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.expressCallback(request, { ok: true, id: 'doc', rev: '1-a' }, { user: 'user', requestId: '123' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '123',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on db-doc PUT', async () => {
      const request = getRequest('/medic/doc', 'PUT', { _id: 'doc', _rev: '1-a' });
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.expressCallback(request, { ok: true, id: 'doc', rev: '2-a' }, { user: 'user', requestId: '1234' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '2-a',
          user: 'user',
          request_id: '1234',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on _bulk_docs', async () => {
      const request = getRequest('/medic/_bulk_docs', 'POST', { docs: [{ _id: 'doc', _rev: '1-a' }], new_edits: true });
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.expressCallback(request, [{ ok: true, rev: '1-a', id: 'doc'}], { user: 'user', requestId: '456' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });

    it('should record audit on _bulk_docs with new_edits', async () => {
      const request = getRequest(
        '/medic/_bulk_docs',
        'POST',
        { docs: [{ _id: 'doc', _rev: '1-a' }], new_edits: false }
      );
      db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

      await lib.expressCallback(request, [], { user: 'user', requestId: '456' });

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0]).to.deep.equal([[{
        _id: 'doc',
        _rev: undefined,
        history: [{
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }]
      }]]);
    });
  });

  it('should skip auditing ignore docs', async () => {
    const response = getResponse(true, true, false, { ok: true, id: 'service-worker-meta', rev: '1-a' });
    db.allDocs.resolves({ rows: [{ key: 'service-worker-meta', error: 'not_found' }] });

    await lib.fetchCallback('http://localhost/medic/service-worker-meta', { method: 'PUT' }, response);

    expect(db.allDocs.callCount).to.equal(0);
    expect(db.bulkDocs.callCount).to.equal(0);
  });

  it('should add to existent history', async () => {
    const response = getResponse(true, true, false, [{ ok: true, id: 'doc', rev: '1-a' }]);
    db.allDocs.resolves({ rows: [
      {
        key: 'doc',
        id: 'doc',
        doc: {
          _id: 'doc',
          _rev: '1-b',
          history: [ { rev: '1-a', user: 'user', request_id: '44', date: new Date(4000), service: 'sentinel' } ]
        }
      }
    ] });

    const body = { docs: [{ _id: 'doc', _rev: '2-a' }], new_edits: true };
    await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'POST', body }, response, { user: 'user', requestId: '456' });

    expect(db.allDocs.callCount).to.equal(1);
    expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
    expect(db.bulkDocs.callCount).to.equal(1);
    expect(db.bulkDocs.args[0]).to.deep.equal([[{
      _id: 'doc',
      _rev: '1-b',
      history: [
        {
          rev: '1-a',
          user: 'user',
          request_id: '44',
          date: new Date(4000),
          service: 'sentinel'
        },
        {
          rev: '1-a',
          user: 'user',
          request_id: '456',
          date: new Date(),
          service: 'api',
        }
      ]
    }]]);
  });

  it('should log rotate when history exceeds length', async () => {
    const response = getResponse(true, true, false, [{ ok: true, id: 'doc', rev: '11-a' }]);
    const oldAuditDoc = {
      _id: 'doc',
      _rev: '1-c',
      history: [
        { rev: '1-a', user: 'user1', request_id: '1', date: new Date(100), service: 'sentinel' },
        { rev: '2-a', user: 'user2', request_id: '2', date: new Date(200), service: 'sentinel' },
        { rev: '3-a', user: 'user1', request_id: '3', date: new Date(300), service: 'sentinel' },
        { rev: '4-a', user: 'user2', request_id: '4', date: new Date(400), service: 'sentinel' },
        { rev: '5-a', user: 'user1', request_id: '5', date: new Date(500), service: 'sentinel' },
        { rev: '6-a', user: 'user2', request_id: '6', date: new Date(600), service: 'sentinel' },
        { rev: '7-a', user: 'user1', request_id: '7', date: new Date(700), service: 'sentinel' },
        { rev: '8-a', user: 'user2', request_id: '8', date: new Date(800), service: 'sentinel' },
        { rev: '9-a', user: 'user1', request_id: '9', date: new Date(900), service: 'sentinel' },
        { rev: '10-a', user: 'user2', request_id: '10', date: new Date(1000), service: 'sentinel' },

      ],
    };
    db.allDocs.resolves({ rows: [
      {
        key: 'doc',
        id: 'doc',
        doc: { ...oldAuditDoc },
      }
    ] });

    const body = { docs: [{ _id: 'doc', _rev: '11-a' }], new_edits: true };
    await lib.fetchCallback('http://localhost/medic/_bulk_docs', { method: 'POST', body }, response, { user: 'user', requestId: '321' });

    expect(db.allDocs.callCount).to.equal(1);
    expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
    expect(db.bulkDocs.callCount).to.equal(1);

    expect(db.bulkDocs.args[0]).to.deep.equal([[
      {
        ...oldAuditDoc,
        _id: `doc:10-a`,
        _rev: undefined
      },
      {
        _id: 'doc',
        _rev: '1-c',
        history: [
          {
            rev: '11-a',
            user: 'user',
            request_id: '321',
            date: new Date(),
            service: 'api',
          }
        ]
      }
    ]]);
  });

  it('should skip adding request ids when request metadata is not set', async () => {
    const response = getResponse(true, true, false, { ok: true, id: 'doc', rev: '1-a' });
    db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

    await lib.fetchCallback('http://localhost/medic/doc', { method: 'PUT' }, response);

    expect(db.allDocs.callCount).to.equal(1);
    expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
    expect(db.bulkDocs.callCount).to.equal(1);
    expect(db.bulkDocs.args[0]).to.deep.equal([[{
      _id: 'doc',
      _rev: undefined,
      history: [{
        rev: '1-a',
        user: 'admin',
        request_id: undefined,
        date: new Date(),
        service: 'api',
      }]
    }]]);
  });

  it('should add correct service field', async () => {
    const response = getResponse(true, true, false, { ok: true, id: 'doc', rev: '1-a' });
    environment.getService.returns('cht-service');
    db.allDocs.resolves({ rows: [{ key: 'doc', error: 'not_found' }] });

    await lib.fetchCallback('http://localhost/medic/doc', { method: 'PUT' }, response);

    expect(db.allDocs.callCount).to.equal(1);
    expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc'], include_docs: true }]);
    expect(db.bulkDocs.callCount).to.equal(1);
    expect(db.bulkDocs.args[0]).to.deep.equal([[{
      _id: 'doc',
      _rev: undefined,
      history: [{
        rev: '1-a',
        user: 'admin',
        request_id: undefined,
        date: new Date(),
        service: 'cht-service',
      }]
    }]]);
  });
});
