const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const rewire = require('rewire');

const environment = require('@medic/environment');
const { DOC_IDS } = require('@medic/constants');

let lib;

describe('Audit', () => {
  let db;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers(1000);
    sinon.stub(environment, 'db').get(() => 'medic');
    sinon.stub(environment, 'username').get(() => 'admin');
    sinon.stub(environment, 'getService').returns('api');

    lib = rewire('../src/index');
    db = {
      allDocs: sinon.stub().resolves({ rows: [] }),
      bulkDocs: sinon.stub().resolves([]),
    };
    lib.__set__('db', db);
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
    const response = getResponse(true, true, false, { ok: true, id: DOC_IDS.SERVICE_WORKER_META, rev: '1-a' });
    db.allDocs.resolves({ rows: [{ key: DOC_IDS.SERVICE_WORKER_META, error: 'not_found' }] });

    await lib.fetchCallback(`http://localhost/medic/${DOC_IDS.SERVICE_WORKER_META}`, { method: 'PUT' }, response);

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

  describe('recordArchiving', () => {
    it('appends an archive entry to the existing audit doc for each id', async () => {
      const date = 1234567890;
      const existing = {
        _id: 'doc-a',
        _rev: '1-a',
        history: [{ rev: '1-a', user: 'admin', date: new Date(500), service: 'api' }],
      };
      db.allDocs.resolves({ rows: [{ id: 'doc-a', doc: existing }] });

      await lib.recordArchiving(['doc-a'], date);

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: ['doc-a'], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      const written = db.bulkDocs.args[0][0];
      expect(written).to.have.lengthOf(1);
      expect(written[0]._id).to.equal('doc-a');
      expect(written[0]._rev).to.equal('1-a');
      expect(written[0].history).to.deep.equal([
        { rev: '1-a', user: 'admin', date: new Date(500), service: 'api' },
        { date, archived: true },
      ]);
    });

    it('creates a fresh audit doc with the archive entry when none exists', async () => {
      const date = 99;
      db.allDocs.resolves({ rows: [{ key: 'doc-new', error: 'not_found' }] });

      await lib.recordArchiving(['doc-new'], date);

      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0][0]).to.deep.equal([{
        _id: 'doc-new',
        _rev: undefined,
        history: [{ date, archived: true }],
      }]);
    });

    it('records archive entries for a mix of existing and new audit docs in one bulk write', async () => {
      const date = 7777;
      db.allDocs.resolves({
        rows: [
          { id: 'doc-a', doc: { _id: 'doc-a', _rev: '1-a', history: [] } },
          { key: 'doc-b', error: 'not_found' },
          { id: 'doc-c', doc: { _id: 'doc-c', _rev: '3-c', history: [{ rev: '3-c', date: new Date(1) }] } },
        ],
      });

      await lib.recordArchiving(['doc-a', 'doc-b', 'doc-c'], date);

      expect(db.bulkDocs.callCount).to.equal(1);
      const written = db.bulkDocs.args[0][0];
      expect(written).to.have.lengthOf(3);

      expect(written[0]._id).to.equal('doc-a');
      expect(written[0]._rev).to.equal('1-a');
      expect(written[0].history).to.deep.equal([{ date, archived: true }]);

      expect(written[1]._id).to.equal('doc-b');
      expect(written[1]._rev).to.equal(undefined);
      expect(written[1].history).to.deep.equal([{ date, archived: true }]);

      expect(written[2]._id).to.equal('doc-c');
      expect(written[2]._rev).to.equal('3-c');
      expect(written[2].history).to.deep.equal([
        { rev: '3-c', date: new Date(1) },
        { date, archived: true },
      ]);
    });

    it('writes nothing when called with an empty id list', async () => {
      db.allDocs.resolves({ rows: [] });

      await lib.recordArchiving([], 1000);

      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.args[0]).to.deep.equal([{ keys: [], include_docs: true }]);
      expect(db.bulkDocs.callCount).to.equal(1);
      expect(db.bulkDocs.args[0][0]).to.deep.equal([]);
    });

    it('preserves the prior history when appending the archive entry', async () => {
      const date = 42;
      const existingHistory = [
        { rev: '1-a', user: 'alice', date: new Date(10), service: 'api' },
        { rev: '2-b', user: 'bob', date: new Date(20), service: 'sentinel' },
      ];
      db.allDocs.resolves({ rows: [{
        id: 'doc-a',
        doc: { _id: 'doc-a', _rev: '2-b', history: [...existingHistory] },
      }] });

      await lib.recordArchiving(['doc-a'], date);

      const written = db.bulkDocs.args[0][0][0];
      expect(written.history).to.deep.equal([
        ...existingHistory,
        { date, archived: true },
      ]);
    });
  });
});
