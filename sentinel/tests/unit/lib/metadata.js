const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');

describe('metadata', () => {

  afterEach(() => sinon.restore());

  describe('getTransitionSeq', () => {

    it('fetches metadata doc', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq').resolves({
        _id: '_local/transitions-seq',
        _rev: '1',
        value: '12'
      });
      return metadata.getTransitionSeq().then(seq => {
        chai.expect(seq).to.equal('12');
      });
    });

  });

  describe('setTransitionSeq', () => {
    it('works as expected', () => {
      sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq').resolves({
        _id: '_local/transitions-seq',
        _rev: '1',
        value: '12'
      });
      sinon.stub(db.sentinel, 'put').resolves();
      return metadata.setTransitionSeq('55').then(() => {
        chai.expect(db.sentinel.get.callCount).to.equal(1);
        chai.expect(db.sentinel.put.callCount).to.equal(1);
        chai.expect(db.sentinel.put.args[0][0]).to.deep.equal({
          _id: '_local/transitions-seq',
          _rev: '1',
          value: '55'
        });
      });
    });
  });

});
