describe('ImportContacts service', function() {

  'use strict';

  let service;
  let put;
  let $httpBackend;
  let $rootScope;

  beforeEach(function() {
    put = sinon.stub();
    module('adminApp');

    const types = [ { id: 'person' }, { id: 'chp' } ];
    const ContactTypes = {
      getPersonTypes: sinon.stub().resolves(types),
      getTypeId: sinon.stub().callsFake(doc => doc.type === 'contact' ? doc.contact_type : doc.type),
    };

    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put }));
      $provide.value('Location', { url: 'BASEURL' });
      $provide.value('ContactTypes', ContactTypes);
    });
    inject(function($injector, _$rootScope_) {
      $rootScope = _$rootScope_;
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('ImportContacts');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    KarmaUtils.restore(put);
  });

  it('does nothing when there are no contacts', function(done) {
    service([], true)
      .then(function() {
        done();
      })
      .catch(done);
    $rootScope.$digest();
  });

  it('returns error when checking for existing contact errors', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(503, 'boom');
    service([{ _id: 1 }], true)
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.data).to.equal('boom');
        done();
      });
    $httpBackend.flush();
  });

  it('returns error when saving contact errors', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(404);
    put.returns(Promise.reject('boom'));
    service([{ _id: 1 }], true)
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
    $httpBackend.flush();
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('creates new docs when none found', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/2')
      .respond(404);
    put
      .onFirstCall().returns(Promise.resolve({ _id: 1, _rev: 1 }))
      .onSecondCall().returns(Promise.resolve({ _id: 2, _rev: 1 }));
    const contact1 = { _id: 1 };
    const contact2 = { _id: 2 };

    service([contact1, contact2], true)
      .then(function() {
        chai.expect(put.calledTwice).to.equal(true);
        chai.expect(put.args[0][0]).to.deep.equal(contact1);
        chai.expect(put.args[1][0]).to.deep.equal(contact2);
        done();
      })
      .catch(done);

    $httpBackend.flush();
    setTimeout(function() {
      $rootScope.$digest();
      setTimeout(function() {
        $rootScope.$digest();
      });
    });
  });

  it('overwrites docs when flagged', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(200, '', { ETag: 'abc' });
    $httpBackend
      .expect('HEAD', 'BASEURL/2')
      .respond(200, '', { ETag: 'def' });
    put
      .onFirstCall().returns(Promise.resolve({ _id: 1, _rev: 1 }))
      .onSecondCall().returns(Promise.resolve({ _id: 2, _rev: 1 }));

    service([{ _id: 1 }, { _id: 2 }], true)
      .then(function() {
        chai.expect(put.calledTwice).to.equal(true);
        chai.expect(put.args[0][0]._id).to.equal(1);
        chai.expect(put.args[1][0]._id).to.equal(2);
        done();
      })
      .catch(done);

    $httpBackend.flush();
    setTimeout(function() {
      $rootScope.$digest();
      setTimeout(function() {
        $rootScope.$digest();
      });
    });
  });

  it('leaves docs unchanged when not flagged', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/2')
      .respond(200, '', { ETag: 'def' });
    put
      .onFirstCall().returns(Promise.resolve({ _id: 1, _rev: 1 }))
      .onSecondCall().returns(Promise.resolve({ _id: 2, _rev: 1 }));

    service([{ _id: 1 }, { _id: 2 }], false)
      .then(function() {
        chai.expect(put.calledOnce).to.equal(true);
        chai.expect(put.args[0][0]).to.deep.equal({ _id: 1, _rev: 1 });
        done();
      })
      .catch(done);

    $httpBackend.flush();
    setTimeout(function() {
      $rootScope.$digest();
      setTimeout(function() {
        $rootScope.$digest();
      });
    });
  });

  it('creates person docs when required', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/2')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/5')
      .respond(404);
    put.onCall(0).returns(Promise.resolve({ _id: 1, _rev: 1 }));
    put.onCall(1).returns(Promise.resolve({ _id: 2, _rev: 1 }));
    put.onCall(2).returns(Promise.resolve({ _id: 5, _rev: 1 }));
    put.onCall(3).returns(Promise.resolve({ _id: 4, _rev: 1 }));
    put.onCall(4).resolves({});
    const contact1 = { _id: 1, contact: { name: 'john', phone: '+123', type: 'contact', contact_type: 'chp' } };
    const contact2 = { _id: 2, contact: { _id: 3, name: 'jack', phone: '+123' } };
    const contact3 = { _id: 5, name: 'mary', phone: '+123', type: 'person', contact_type: 'omg' };

    service([contact1, contact2, contact3], true)
      .then(function() {
        chai.expect(put.callCount).to.equal(5);

        // save first place
        chai.expect(put.args[0][0]._id).to.equal(1);
        chai.expect(put.args[0][0].contact.name).to.equal('john');
        chai.expect(put.args[0][0].contact.type).to.equal('contact');
        chai.expect(put.args[0][0].contact.contact_type).to.equal('chp');
        chai.expect(put.args[0][0].contact.phone).to.equal('+123');

        // save second place
        chai.expect(put.args[1][0]).to.deep.equal(contact2);

        // save 3rd contact
        chai.expect(put.args[2][0]).to.deep.equal(contact3);

        // save contact
        chai.expect(put.args[3][0].type).to.equal('contact');
        chai.expect(put.args[3][0].contact_type).to.equal('chp');
        chai.expect(put.args[3][0].name).to.equal('john');
        chai.expect(put.args[3][0].phone).to.equal('+123');
        chai.expect(put.args[3][0].parent._id).to.equal(1);

        // updated place with contact
        chai.expect(put.args[4][0].contact._id).to.equal(4);
        chai.expect(put.args[4][0].contact._rev).to.equal(1);
        done();
      })
      .catch(done);

    $httpBackend.flush();
    setTimeout(function() {
      $rootScope.$digest();
      setTimeout(function() {
        $rootScope.$digest();
        setTimeout(function() {
          $rootScope.$digest();
          setTimeout(function() {
            $rootScope.$digest();
          });
        });
      });
    });
  });

});
