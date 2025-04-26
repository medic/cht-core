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

    sinon.stub(environment, 'db').get(() => 'http://admin:pass@localhost:5984/medic');
    sinon.stub(environment, 'username').get(() => 'admin');
    sinon.stub(environment, 'getService').returns('api');
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('fetchCallback', () => {
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

    });

    it('should record audit on _bulk_docs', async () => {

    });

    it('should record audit on _bulk_docs with new_edits', async () => {

    });

    it('should skip adding request ids when local storage is not set', async () => {

    });

    it('should skip auditing ignore docs', async () => {

    });

    it('should add to existent history', async () => {

    });

    it('should log rotate when history exceeds length', async () => {

    });
  });

  describe('expressCallback', () => {
    it('should skip invalid requests', async () => {

    });

    it('should skin non-json responses', async () => {

    });

    it('should skip non-write requests', async () => {

    });

    it('should record audit on db-doc POST', async () => {

    });

    it('should record audit on db-doc PUT', async () => {

    });

    it('should record audit on _bulk_docs', async () => {

    });

    it('should record audit on _bulk_docs with new_edits', async () => {

    });

    it('should skip adding request ids when local storage is not set', async () => {

    });
  });
});
