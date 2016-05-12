describe('DeleteDoc service', function() {

  'use strict';

  var service,
      get,
      bulkDocs;

  beforeEach(function() {
    get = sinon.stub();
    bulkDocs = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ bulkDocs: bulkDocs, get: get }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_DeleteDoc_) {
      service = _DeleteDoc_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, bulkDocs);
  });

  it('returns put errors', function(done) {
    bulkDocs.returns(KarmaUtils.mockPromise('errcode2'));
    service({ _id: 'xyz' })
      .then(function() {
        done('expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(get.callCount).to.equal(0);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(err).to.equal('errcode2');
        done();
      });
  });

  it('marks the record deleted', function() {
    bulkDocs.returns(KarmaUtils.mockPromise());
    var record = {
      _id: 'xyz',
      type: 'data_record'
    };
    var expected = {
      _id: 'xyz',
      type: 'data_record',
      _deleted: true
    };
    return service(record).then(function() {
      chai.expect(get.callCount).to.equal(0);
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0][0]).to.deep.equal(expected);
    });
  });

  it('marks multiple records deleted', function() {
    bulkDocs.returns(KarmaUtils.mockPromise());
    var record1 = {
      _id: 'xyz',
      type: 'data_record'
    };
    var record2 = {
      _id: 'abc',
      type: 'data_record'
    };
    var expected1 = {
      _id: 'xyz',
      type: 'data_record',
      _deleted: true
    };
    var expected2 = {
      _id: 'abc',
      type: 'data_record',
      _deleted: true
    };
    return service([ record1, record2 ]).then(function() {
      chai.expect(get.callCount).to.equal(0);
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0][0]).to.deep.equal(expected1);
      chai.expect(bulkDocs.args[0][0][1]).to.deep.equal(expected2);
    });
  });

  it('updates clinic deleted person is contact for', function() {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+555'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    get.returns(KarmaUtils.mockPromise(null, clinic));
    bulkDocs.returns(KarmaUtils.mockPromise());
    return service(person).then(function() {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal(clinic._id);
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0].length).to.equal(2);
      chai.expect(bulkDocs.args[0][0][0]._id).to.equal(person._id);
      chai.expect(bulkDocs.args[0][0][0]._deleted).to.equal(true);
      chai.expect(bulkDocs.args[0][0][1]._id).to.equal(clinic._id);
      chai.expect(bulkDocs.args[0][0][1].contact).to.equal(null);
    });
  });

  it('does not update clinic when phone does not match', function() {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+666'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    get.returns(KarmaUtils.mockPromise(null, clinic));
    bulkDocs.returns(KarmaUtils.mockPromise());
    return service(person).then(function() {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal(clinic._id);
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0][0]._id).to.equal(person._id);
      chai.expect(bulkDocs.args[0][0][0]._deleted).to.equal(true);
    });
  });

});
