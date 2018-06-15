describe('DeleteDocs service', function() {

  'use strict';

  var service,
      get,
      bulkDocs,
      isOnlineOnly,
      server;

  beforeEach(function() {
    get = sinon.stub();
    bulkDocs = sinon.stub();
    isOnlineOnly = sinon.stub().returns(false);
    module('inboxApp');
    const Changes = () => undefined;
    Changes.killWatchers = () => undefined;

    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ bulkDocs: bulkDocs, get: get }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', { isOnlineOnly: isOnlineOnly });
      $provide.value('Changes', Changes);
    });
    inject(function(_DeleteDocs_) {
      service = _DeleteDocs_;
    });
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
  });

  afterEach(function() {
    KarmaUtils.restore(get, bulkDocs);
    server.restore();
  });

  it('returns bulkDocs errors', function(done) {
    bulkDocs.returns(Promise.reject('errcode2'));
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

  it('throws if silent errors in bulkDocs', function(done) {
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
    get.returns(Promise.resolve(clinic));
    bulkDocs.returns(Promise.resolve(
      // person is not deleted, but clinic is edited just fine. Oops.
      [
        { id: person._id, error:'conflict' },
        { id: clinic._id }
      ]
    ));
    service(person)
      .then(function() {
        done('expected error to be thrown');
      })
      .catch(function() {
        done();
      });
  });

  it('does not allow deleting child and parent that will conflict', function(done) {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
        name: 'sally'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    get.returns(Promise.resolve(clinic));
    service([ person, clinic ])
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function() {
        done();
      });
  });

  it('marks the record deleted', function() {
    bulkDocs.returns(Promise.resolve([]));
    var record = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record'
    };
    var expected = {
      _id: 'xyz',
      _rev: '123',
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
    bulkDocs.returns(Promise.resolve([]));
    var record1 = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record'
    };
    var record2 = {
      _id: 'abc',
      _rev: '456',
      type: 'data_record'
    };
    var expected1 = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record',
      _deleted: true
    };
    var expected2 = {
      _id: 'abc',
      _rev: '456',
      type: 'data_record',
      _deleted: true
    };
    return service([ record1, record2 ]).then(function() {
      chai.expect(get.callCount).to.equal(0);
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0].length).to.equal(2);
      chai.expect(bulkDocs.args[0][0][0]).to.deep.equal(expected1);
      chai.expect(bulkDocs.args[0][0][1]).to.deep.equal(expected2);
    });
  });

  it('sends a direct request to the server when user is an admin', function() {
    var record1 = { _id: 'xyz', _rev: '1' };
    var record2 = { _id: 'abc', _rev: '1' };
    var expected1 = { _id: 'xyz' };
    var expected2 = { _id: 'abc' };
    server.respondWith([200, { 'Content-Type': 'application/json' }, '{ "hello": "there" }']);
    isOnlineOnly.returns(true);
    return service([ record1, record2 ]).then(function() {
      chai.expect(server.requests).to.have.lengthOf(1);
      chai.expect(server.requests[0].url).to.equal('/api/v1/bulk-delete');
      chai.expect(server.requests[0].requestBody).to.equal(JSON.stringify({
        docs: [expected1, expected2]
      }));
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('fires the progress event handler on progress events', function(done) {
    var record1 = { _id: 'xyz' };
    var record2 = { _id: 'abc' };
    var onProgress = sinon.spy();
    var response = '[[{"ok": true}, {"ok": true}],';
    server.respondWith([200, { 'Content-Type': 'application/json' }, response]);
    isOnlineOnly.returns(true);
    service([ record1, record2 ], { progress: onProgress })
      .then(() => {
        done(Error('Should have thrown')); // The onload handler should throw an error due to partial json
      })
      .catch(function() {
        chai.expect(onProgress.callCount).to.equal(1);
        chai.expect(onProgress.getCall(0).args[0]).to.equal(2);
        done();
    });
  });

  it('does not modify the given array - #2417', function() {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
        name: 'sally'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    var docs = [ person ];
    get.returns(Promise.resolve(clinic));
    bulkDocs.returns(Promise.resolve([]));
    return service(docs).then(function() {
      chai.expect(docs.length).to.equal(1);
      chai.expect(bulkDocs.args[0][0].length).to.equal(2);
    });
  });

  it('minifies lineage for circular referenced report #4076', function() {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: clinic
    };
    clinic.contact = person;

    var report = {
      _id: 'c',
      type: 'data_record',
      contact: person
    };

    var docs = [ report ];
    bulkDocs.returns(Promise.resolve([]));
    var isCircularBefore = false;
    var isCircularAfter = false;
    try {
      JSON.stringify(report);
    } catch (e) {
      if (e.message === 'Converting circular structure to JSON') {
        isCircularBefore = true;
      }
    }

    return service(docs).then(function() {
      chai.expect(docs.length).to.equal(1);
      chai.expect(isCircularBefore).to.equal(true);
      try {
        JSON.stringify(bulkDocs.args[0][0][0]);
      } catch (e) {
        if (e.message === 'Converting circular structure to JSON') {
          isCircularAfter = true;
        }
      }
      chai.expect(isCircularAfter).to.equal(false);
      chai.expect(bulkDocs.args[0][0].length).to.equal(1);
    });
  });
});
