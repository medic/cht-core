describe('CheckDate service', function() {

  'use strict';

  var service,
      $httpBackend,
      clock,
      jqModal;

  beforeEach(function() {
    clock = null;
    jqModal = sinon.stub($.fn, 'modal');
    module('inboxApp');
    inject(function(_CheckDate_, _$httpBackend_) {
      service = _CheckDate_;
      $httpBackend = _$httpBackend_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(clock, jqModal);
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('does nothing when offline and roughly correct date', function(done) {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9\.]+/)
      .respond(404, 'Not found');
    var scope = {};
    service(scope)
      .then(function() {
        chai.expect(scope.reportedLocalDate).to.equal(undefined);
        chai.expect(scope.expectedLocalDate).to.equal(undefined);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('shows the modal when offline but clock is very wrong', function(done) {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9\.]+/)
      .respond(404, 'Not found');
    var scope = {};
    clock = sinon.useFakeTimers();
    service(scope)
      .then(function() {
        chai.expect(scope.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
        chai.expect(scope.expectedLocalDate).to.equal(undefined);
        chai.expect(jqModal.callCount).to.equal(1);
        chai.expect(jqModal.args[0][0]).to.equal('show');
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('handles empty response', function(done) {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9\.]+/)
      .respond('', { Date: 'xxx' });
    var scope = {};
    service(scope)
      .then(function() {
        chai.expect(scope.reportedLocalDate).to.equal(undefined);
        chai.expect(scope.expectedLocalDate).to.equal(undefined);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('handles response with timestamp close enough', function(done) {
    var responseDate = new Date();
    responseDate.setMinutes(responseDate.getMinutes() - 5);
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9\.]+/)
      .respond('', { Date: responseDate.toISOString() });
    var scope = {};
    service(scope)
      .then(function() {
        chai.expect(scope.reportedLocalDate).to.equal(undefined);
        chai.expect(scope.expectedLocalDate).to.equal(undefined);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('shows modal when response date is way out', function(done) {
    clock = sinon.useFakeTimers();
    var responseDate = new Date();
    responseDate.setHours(responseDate.getHours() - 1);
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9\.]+/)
      .respond('', { Date: responseDate.toISOString() });
    var scope = {};
    service(scope)
      .then(function() {
        chai.expect(scope.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
        chai.expect(scope.expectedLocalDate.toISOString()).to.equal(responseDate.toISOString());
        chai.expect(jqModal.callCount).to.equal(1);
        chai.expect(jqModal.args[0][0]).to.equal('show');
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

});
