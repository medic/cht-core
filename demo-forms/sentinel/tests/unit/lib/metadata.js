const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');

describe('metadata', () => {

  afterEach(() => sinon.restore());

  describe('getProcessedSeq', () => {

    it('handles missing metadata doc', () => {
      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      return metadata.getProcessedSeq().then(seq => {
        chai.expect(db.sentinel.get.callCount).to.equal(1);
        chai.expect(db.sentinel.get.args[0][0]).to.equal('_local/sentinel-meta-data');
        chai.expect(db.medic.get.callCount).to.equal(2);
        chai.expect(db.medic.get.args[0][0]).to.equal('_local/sentinel-meta-data');
        chai.expect(db.medic.get.args[1][0]).to.equal('sentinel-meta-data');
        chai.expect(seq).to.equal(0);
      });
    });

    it('migrates old metadata doc', () => {
      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get')
        .withArgs('_local/sentinel-meta-data').rejects({ status: 404 })
        .withArgs('sentinel-meta-data').resolves({
          _id: 'sentinel-meta-data',
          _rev: '1',
          processed_seq: '12'
        });
      sinon.stub(db.medic, 'put').resolves();
      return metadata.getProcessedSeq().then(seq => {
        chai.expect(db.medic.get.callCount).to.equal(2);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0][0]).to.deep.equal({
          _id: 'sentinel-meta-data',
          _rev: '1',
          _deleted: true
        });
        chai.expect(seq).to.equal('12');
      });
    });

    it('migrates medic metadata doc', () => {
      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').resolves({
        _id: '_local/sentinel-meta-data',
        _rev: '1',
        processed_seq: '12'
      });
      sinon.stub(db.medic, 'put').resolves();
      return metadata.getProcessedSeq().then(seq => {
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0][0]).to.deep.equal({
          _id: '_local/sentinel-meta-data',
          _rev: '1',
          _deleted: true
        });
        chai.expect(seq).to.equal('12');
      });
    });

    it('fetches modern metadata doc', () => {
      sinon.stub(db.sentinel, 'get').resolves({
        _id: '_local/sentinel-meta-data',
        _rev: '1',
        processed_seq: '12'
      });
      sinon.stub(db.medic, 'get').resolves();
      sinon.stub(db.medic, 'put').resolves();
      return metadata.getProcessedSeq().then(seq => {
        chai.expect(db.medic.get.callCount).to.equal(0);
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(seq).to.equal('12');
      });
    });

  });

  describe('update', () => {
    it('works as expected', () => {
      sinon.stub(db.sentinel, 'get').resolves({
        _id: '_local/sentinel-meta-data',
        _rev: '1',
        processed_seq: '12'
      });
      sinon.stub(db.sentinel, 'put').resolves();
      return metadata.update('55').then(() => {
        chai.expect(db.sentinel.get.callCount).to.equal(1);
        chai.expect(db.sentinel.put.callCount).to.equal(1);
        chai.expect(db.sentinel.put.args[0][0]).to.deep.equal({
          _id: '_local/sentinel-meta-data',
          _rev: '1',
          processed_seq: '55'
        });
      });
    });
  });

});
