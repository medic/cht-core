const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');


let db;

describe('db', () => {
  before(() => {
    sinon.stub(process, 'env').value({ UNIT_TEST_ENV: false });
    sinon.stub(environment, 'couchUrl').value('http://admin:pass@localhost:5984/medic');
    sinon.stub(environment, 'serverUrl').value('http://admin:pass@localhost:5984');
    sinon.stub(environment, 'db').value('medic');
    db = rewire('../../src/db');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('allDbs', () => {
    it('should request _all_dbs', () => {
      sinon.stub(request, 'get').resolves(['db1', 'db2']);
      return db.allDbs().then(result => {
        expect(result).to.deep.equal(['db1', 'db2']);
        expect(request.get.callCount).to.equal(1);
        expect(request.get.args[0]).to.deep.equal([{
          url: 'http://admin:pass@localhost:5984/_all_dbs',
          json: true,
        }]);
      });
    });

    it('should throw errors', () => {
      sinon.stub(request, 'get').rejects({ error: 'omg' });
      return db
        .allDbs()
        .then(() => expect.fail())
        .catch(err => {
          expect(err).to.deep.equal({ error: 'omg' });
        });
    });
  });

  describe('close', () => {
    it('should work with invalid param or closed db', () => {
      db.close();
      db.close({ _destroyed: true });
      db.close({ _closed: true });
    });

    it('should close the db', () => {
      const database = { close: sinon.stub() };
      db.close(database);
      expect(database.close.callCount).to.equal(1);
    });

    it('should catch db.close error', () => {
      const database = { close: sinon.stub().throws() };
      db.close(database);
      expect(database.close.callCount).to.equal(1);
    });
  });

  describe('queryMedic', () => {
    beforeEach(() => {
      sinon.stub(request, 'get');
      sinon.stub(request, 'post');
    });

    it('should get medicdb view with params', () => {
      const params = { limit: 100, start_key: 'thing', param: 200 };
      request.get.resolves({ the: 'response' });
      return db.queryMedic('ddoc_name/view_name', params).then(response => {
        expect(response).to.deep.equal({ the: 'response' });
        expect(request.get.callCount).to.equal(1);
        expect(request.get.args[0]).to.deep.equal([{
          url: 'http://admin:pass@localhost:5984/medic/_design/ddoc_name/_view/view_name',
          qs: { limit: 100, start_key: 'thing', param: 200 },
          json: true,
          body: undefined,
        }]);
        expect(request.post.callCount).to.equal(0);
      });
    });

    it('should post to medicdb view with params', () => {
      const params = { skip: 100, start_key: 'thing', whatever: 'yes' };
      const body = { keys: [1, 2, 3] };
      request.post.resolves({ the: 'response' });
      return db.queryMedic('medic-client/contacts_by_depth', params, body).then(response => {
        expect(response).to.deep.equal({ the: 'response' });
        expect(request.get.callCount).to.equal(0);
        expect(request.post.callCount).to.equal(1);
        expect(request.post.args[0]).to.deep.equal([{
          url: 'http://admin:pass@localhost:5984/medic/_design/medic-client/_view/contacts_by_depth',
          qs: { skip: 100, start_key: 'thing', whatever: 'yes' },
          json: true,
          body: { keys: [1, 2, 3] },
        }]);
      });
    });

    it('should get medicdb _all_docs with params', () => {
      const params = { nothing: 'is', left: 'out' };
      request.get.resolves({ response: 'this' });
      return db.queryMedic('allDocs', params).then(response => {
        expect(response).to.deep.equal({ response: 'this' });
        expect(request.get.callCount).to.equal(1);
        expect(request.get.args[0]).to.deep.equal([{
          url: 'http://admin:pass@localhost:5984/medic/_all_docs',
          qs: { nothing: 'is', left: 'out' },
          json: true,
          body: undefined,
        }]);
        expect(request.post.callCount).to.equal(0);
      });
    });

    it('should post to medicdb _all_docs with params', () => {
      const params = { start_key: JSON.stringify('thing'), start_key_doc_id: 'thing' };
      const body = { keys: [4, 5, 6] };
      request.post.resolves({ the: 'response' });
      return db.queryMedic('allDocs', params, body).then(response => {
        expect(response).to.deep.equal({ the: 'response' });
        expect(request.get.callCount).to.equal(0);
        expect(request.post.callCount).to.equal(1);
        expect(request.post.args[0]).to.deep.equal([{
          url: 'http://admin:pass@localhost:5984/medic/_all_docs',
          qs: { start_key: JSON.stringify('thing'), start_key_doc_id: 'thing' },
          json: true,
          body: { keys: [4, 5, 6] },
        }]);
      });
    });

    it('should throw request.get errors', () => {
      request.get.rejects({ an: 'error' });

      return db
        .queryMedic('allDocs', {})
        .then(() => expect.fail())
        .catch(err => {
          expect(err).to.deep.equal({ an: 'error' });
        });
    });

    it('should throw request.post errors', () => {
      request.post.rejects({ the: 'error' });

      return db
        .queryMedic('allDocs', {}, {})
        .then(() => expect.fail())
        .catch(err => {
          expect(err).to.deep.equal({ the: 'error' });
        });
    });
  });

  describe('purge', () => {
    it('posts a {id: [rev, ...conflicts]} map to <db>/_purge', async () => {
      const fakeDb = { name: 'http://admin:pass@localhost:5984/medic' };
      sinon.stub(request, 'post').resolves({ purged: {} });

      const docs = [
        { _id: 'doc-a', _rev: '1-a' },
        { _id: 'doc-b', _rev: '2-b', _conflicts: ['2-bb', '2-bbb'] },
      ];
      await db.purge(fakeDb, docs);

      expect(request.post.callCount).to.equal(1);
      expect(request.post.args[0]).to.deep.equal([{
        url: 'http://admin:pass@localhost:5984/medic/_purge',
        body: {
          'doc-a': ['1-a'],
          'doc-b': ['2-b', '2-bb', '2-bbb'],
        },
      }]);
    });

    it('omits conflicts when the doc has none', async () => {
      sinon.stub(request, 'post').resolves();
      await db.purge({ name: 'host/db' }, [{ _id: 'x', _rev: '3-x' }]);
      expect(request.post.args[0][0].body).to.deep.equal({ x: ['3-x'] });
    });

    it('handles an empty docs array', async () => {
      sinon.stub(request, 'post').resolves();
      await db.purge({ name: 'host/db' }, []);
      expect(request.post.args[0][0].body).to.deep.equal({});
    });

    it('throws request.post errors', async () => {
      sinon.stub(request, 'post').rejects(new Error('purge failed'));
      try {
        await db.purge({ name: 'host/db' }, [{ _id: 'x', _rev: '1-x' }]);
        expect.fail('expected to reject');
      } catch (err) {
        expect(err.message).to.equal('purge failed');
      }
    });
  });
});
