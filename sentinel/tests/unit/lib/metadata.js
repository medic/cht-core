const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');

describe('metadata', () => {

  afterEach(() => sinon.restore());

  describe('Get value', () => {

    it('fetches metadata doc', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/foo').resolves({
        _id: '_local/transitions-seq',
        _rev: '1',
        value: '12'
      });

      return metadata._getValue('_local/foo').then(seq => {
        chai.expect(seq).to.equal('12');
      });
    });

    it('uses default value if the doc doesnt exist', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/foo').rejects({status: 404});

      return metadata._getValue('_local/foo', '42').then(seq => {
        chai.expect(seq).to.equal('42');
      });
    });

    it('but it does throw non 404 errors', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/foo').rejects({status: 500});

      return metadata._getValue('_local/foo').then(() => {
        chai.assert.fail();
      }).catch(err => {
        chai.expect(err).to.deep.equal({status: 500});
      });
    });
  });

  describe('setValue', () => {
    it('works as expected', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/foo').resolves({
        _id: '_local/foo',
        _rev: '1',
        value: '12'
      });
      sinon.stub(db.sentinel, 'put').resolves();
      return metadata._setValue('_local/foo', '55').then(() => {
        chai.expect(db.sentinel.get.callCount).to.equal(1);
        chai.expect(db.sentinel.put.callCount).to.equal(1);
        chai.expect(db.sentinel.put.args[0][0]).to.deep.equal({
          _id: '_local/foo',
          _rev: '1',
          value: '55'
        });
      });
    });
  });

});
