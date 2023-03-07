const sinon = require('sinon');
const chai = require('chai');

const service = require('../../../src/services/extension-libs');
const db = require('../../../src/db');

describe('Extension Libs service', () => {

  let dbGet;

  beforeEach(() => {
    dbGet = sinon.stub(db.medic, 'get');
  });
  afterEach(() => sinon.restore());

  describe('isLibChange', () => {

    it('false if invalid params', () => {
      const actual = service.isLibChange();
      chai.expect(actual).to.be.false;
    });

    it('false if different doc', () => {
      const actual = service.isLibChange({ id: 'myform' });
      chai.expect(actual).to.be.false;
    });

    it('true if extension lib doc', () => {
      const actual = service.isLibChange({ id: 'extension-libs' });
      chai.expect(actual).to.be.true;
    });

  });

  describe('getAll', () => {

    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.getAll();
      chai.expect(actual.length).to.eq(0);
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 403 });
      try {
        await service.getAll();
      } catch(e) {
        chai.expect(e.status).to.equal(403);
        chai.expect(dbGet.callCount).to.equal(1);
        return;
      }
      throw new Error('Expected error to be thrown');
    });

    it('handles empty doc', async () => {
      dbGet.resolves({ _id: 'extension-libs' });
      const actual = await service.getAll();
      chai.expect(actual.length).to.eq(0);
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('handles no attachments', async () => {
      dbGet.resolves({ _id: 'extension-libs', _attachments: {} });
      const actual = await service.getAll();
      chai.expect(actual.length).to.eq(0);
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('maps attachments', async () => {
      dbGet.resolves({ _id: 'extension-libs', _attachments: {
        'first': { data: 'abc', content_type: 'json' },
        'second': { data: 'def', content_type: 'javascript' }
      } });
      const actual = await service.getAll();
      chai.expect(actual.length).to.eq(2);
      chai.expect(actual[0]).to.deep.equal({ name: 'first', data: 'abc', contentType: 'json' });
      chai.expect(actual[1]).to.deep.equal({ name: 'second', data: 'def', contentType: 'javascript' });
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbGet.args[0][0]).to.equal('extension-libs');
      chai.expect(dbGet.args[0][1]).to.deep.equal({ attachments: true });
    });

  });

  describe('get', () => {

    it('handles undefined param', async () => {
      dbGet.resolves({ _id: 'extension-libs', _attachments: {
        first: { data: 'abc', content_type: 'json' },
        second: { data: 'def', content_type: 'javascript' }
      } });
      const actual = await service.get();
      chai.expect(actual).to.be.undefined;
    });

    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.get('second');
      chai.expect(actual).to.be.undefined;
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 403 });
      try {
        await service.get('second');
      } catch(e) {
        chai.expect(e.status).to.equal(403);
        chai.expect(dbGet.callCount).to.equal(1);
        return;
      }
      throw new Error('Expected error to be thrown');
    });

    it('handles empty doc', async () => {
      dbGet.resolves({ _id: 'extension-libs' });
      const actual = await service.get('second');
      chai.expect(actual).to.be.undefined;
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('handles unknown attachment name', async () => {
      dbGet.resolves({ _id: 'extension-libs', _attachments: { first: { data: 'first' } } });
      const actual = await service.get('second');
      chai.expect(actual).to.be.undefined;
      chai.expect(dbGet.callCount).to.equal(1);
    });

    it('returns attachment', async () => {
      dbGet.resolves({ _id: 'extension-libs', _attachments: {
        first: { data: 'abc', content_type: 'json' },
        second: { data: 'def', content_type: 'javascript' }
      } });
      const actual = await service.get('second');
      chai.expect(actual.data).to.equal('def');
      chai.expect(actual.contentType).to.equal('javascript');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbGet.args[0][0]).to.equal('extension-libs');
      chai.expect(dbGet.args[0][1]).to.deep.equal({ attachments: true });
    });

  });

});
