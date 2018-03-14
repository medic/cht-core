const sinon = require('sinon').sandbox.create(),
      db = require('../../../db'),
      expect = require('chai').expect,
      infoUtils = require('../../../lib/info-utils');

describe('infoUtils', () => {

  beforeEach(done => {
    sinon.restore();
    done();
  });

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('Get info doc', () => {
    it('Gets info doc', () => {
      const change = {id: 'foo', doc:{}, info: {}};

      const infoDoc = {
        _id: 'foo-info',
        type: 'info',
        doc_id: 'foo',
        initial_replication_date: new Date()
      };

      sinon.stub(db.sentinel, 'get').callsArgWith(1, null, infoDoc);
      sinon.stub(db.sentinel, 'insert').callsArgWith(1, null, {});

      return infoUtils.getInfoDoc(change).then(info => {
        expect(info).to.not.equal(null);
        expect(db.sentinel.get.calledWith(infoDoc._id)).to.equal(true);
        expect(info.latest_replication_date).to.be.instanceOf(Date);
        expect(db.sentinel.insert.calledWith(infoDoc)).to.equal(true);
      });
    });

    it('If no info doc exists, create one from audit records', () => {
      const change = {id: 'foo'};
      const auditDoc = {
        history: [{
          action: 'something-that-isnt-created',
        }, {
          action: 'create',
          timestamp: new Date()
        }]
      };

      sinon.stub(db.sentinel, 'get').callsArgWith(1, {statusCode: 404});
      sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
      sinon.stub(db.audit, 'get').callsArgWith(1, null, {doc: auditDoc});
      sinon.stub(db.sentinel, 'insert').callsArgWith(1, null, {});

      return infoUtils.getInfoDoc(change).then(info => {
        expect(info).to.not.equal(null);
        expect(db.sentinel.get.calledWith('foo-info')).to.equal(true);
        expect(db.medic.get.calledWith('foo-info')).to.equal(true);
        expect(db.audit.get.calledWith('foo')).to.equal(true);
        expect(db.sentinel.insert.callCount).to.equal(1);
        const infoDoc = db.sentinel.insert.args[0][0];
        expect(infoDoc._id).to.equal('foo-info');
        expect(infoDoc.type).to.equals('info');
        expect(infoDoc.initial_replication_date).to.not.equal(null);
        expect(infoDoc.latest_replication_date).to.not.equal(null);
        expect(infoDoc.initial_replication_date).to.equal(auditDoc.history[1].timestamp);
      });
    });
  });


  describe('Delete info doc', () => {
    it('deleteInfo doc handles missing info doc', () => {
      const given = { id: 'abc' };
      sinon.stub(db.sentinel, 'get').callsArgWith(1, { statusCode: 404 });
      sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
      return infoUtils.deleteInfoDoc(given, err => {
        expect(err === undefined).to.equal(true);
      });
    });

    it('deleteInfoDoc deletes info doc', () => {
      const given = { id: 'abc' };
      const get = sinon.stub(db.sentinel, 'get').callsArgWith(1, null, { _id: 'abc', _rev: '123' });
      const insert = sinon.stub(db.sentinel, 'insert').callsArg(1);
      return infoUtils.deleteInfoDoc(given, err => {
        expect(err === undefined).to.equal(true);
        expect(get.callCount).to.equal(1);
        expect(get.args[0][0]).to.equal('abc-info');
        expect(insert.callCount).to.equal(1);
        expect(insert.args[0][0]._deleted).to.equal(true);
      });
    });
  });
});
