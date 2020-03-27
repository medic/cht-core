describe('CheckDate service', function() {

  'use strict';

  let service;
  let $httpBackend;
  let Modal;
  let Telemetry;
  let clock;

  beforeEach(function() {
    clock = null;
    Modal = sinon.stub();
    Telemetry = { record: sinon.stub() };
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Modal', Modal);
      $provide.value('Telemetry', Telemetry);
    });
    inject(function(_CheckDate_, _$httpBackend_) {
      service = _CheckDate_;
      $httpBackend = _$httpBackend_;
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    sinon.restore();
    if (clock) {
      clock.restore();
    }
  });

  it('does nothing when offline and roughly correct date', done => {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9.]+/)
      .respond(404, 'Not found');
    service()
      .then(function() {
        chai.expect(Modal.callCount).to.equal(0);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('shows the modal when offline but clock is very wrong', done => {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9.]+/)
      .respond(404, 'Not found');
    clock = sinon.useFakeTimers();
    service()
      .then(function() {
        chai.expect(Modal.callCount).to.equal(1);
        chai.expect(Modal.args[0][0].templateUrl).to.equal('templates/modals/bad_local_date.html');
        chai.expect(Modal.args[0][0].controller).to.equal('CheckDateCtrl');
        chai.expect(Modal.args[0][0].model.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
        chai.expect(Modal.args[0][0].model.expectedLocalDate).to.equal(undefined);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('handles empty response', done => {
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9.]+/)
      .respond('', { Date: 'xxx' });
    service()
      .then(function() {
        chai.expect(Modal.callCount).to.equal(0);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('handles response with timestamp close enough', done => {
    const responseDate = new Date();
    responseDate.setMinutes(responseDate.getMinutes() - 5);
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9.]+/)
      .respond('', { Date: responseDate.toISOString() });
    service()
      .then(function() {
        chai.expect(Modal.callCount).to.equal(0);
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

  it('shows modal when response date is way out, man', done => {
    clock = sinon.useFakeTimers();
    const responseDate = new Date();
    responseDate.setHours(responseDate.getHours() - 1);
    $httpBackend
      .expect('HEAD', /\/api\/info\?seed=[0-9.]+/)
      .respond('', { Date: responseDate.toISOString() });
    service()
      .then(function() {
        chai.expect(Modal.callCount).to.equal(1);
        chai.expect(Modal.args[0][0].templateUrl).to.equal('templates/modals/bad_local_date.html');
        chai.expect(Modal.args[0][0].controller).to.equal('CheckDateCtrl');
        chai.expect(Modal.args[0][0].model.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
        chai.expect(Modal.args[0][0].model.expectedLocalDate.toISOString()).to.equal(responseDate.toISOString());
        chai.expect(Telemetry.record.callCount).to.equal(1);
        chai.expect(Telemetry.record.args[0][0]).to.equal('client-date-offset');
        chai.expect(Telemetry.record.args[0][1]).to.equal(60 * 60 * 1000); // client is one hour ahead of server
        done();
      })
      .catch(done);
    $httpBackend.flush();
  });

});
