describe('AndroidApi service', () => {

  'use strict';

  let service;
  let $log;
  let identifyResponse;
  let registerResponse;

  beforeEach(() => {
    module('inboxApp');
    identifyResponse = sinon.stub();
    registerResponse = sinon.stub();
    module($provide => {
      $provide.value('Session', sinon.stub());
      $provide.value('Geolocation', { permissionRequestResolved: sinon.stub() });
      $provide.value('Simprints', {
        identifyResponse: identifyResponse,
        registerResponse: registerResponse
      });
      $provide.value('Feedback', {
        init: sinon.stub(),
        submit: sinon.stub()
      });
    });
    inject((_AndroidApi_, _$log_) => {
      service = _AndroidApi_;
      $log = _$log_;
    });
    $log.reset();
  });

  describe('simprintsResponse', () => {

    it('errors when given string id', () => {
      service.v1.simprintsResponse(null, 'hello', null);
      chai.expect($log.error.logs.length).to.equal(1);
      chai.expect($log.error.logs[0][0].message).to.equal('Unable to parse requestId: "hello"');
      chai.expect(identifyResponse.callCount).to.equal(0);
      chai.expect(registerResponse.callCount).to.equal(0);
    });

    it('errors when given invalid response', () => {
      service.v1.simprintsResponse(null, '1', 'not json');
      chai.expect($log.error.logs.length).to.equal(1);
      chai.expect($log.error.logs[0][0].message).to.equal('Unable to parse JSON response from android app: "not json"');
      chai.expect(identifyResponse.callCount).to.equal(0);
      chai.expect(registerResponse.callCount).to.equal(0);
    });

    it('errors when given unknown request type', () => {
      service.v1.simprintsResponse('query', '1', '{ "id": 153 }');
      chai.expect($log.error.logs.length).to.equal(1);
      chai.expect($log.error.logs[0][0].message).to.equal('Unknown request type: "query"');
      chai.expect(identifyResponse.callCount).to.equal(0);
      chai.expect(registerResponse.callCount).to.equal(0);
    });

    it('calls identify', () => {
      const expectedRequestId = 55498890;
      const expectedResponse = [
        { id: 153, tier: 'TIER_1' },
        { id: 486, tier: 'TIER_5' }
      ];
      service.v1.simprintsResponse('identify', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      chai.expect($log.error.logs.length).to.equal(0);
      chai.expect(identifyResponse.callCount).to.equal(1);
      chai.expect(identifyResponse.args[0][0]).to.equal(expectedRequestId);
      chai.expect(identifyResponse.args[0][1]).to.deep.equal(expectedResponse);
      chai.expect(registerResponse.callCount).to.equal(0);
    });

    it('calls register', () => {
      const expectedRequestId = 54895590;
      const expectedResponse = { id: 849556216 };
      service.v1.simprintsResponse('register', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      chai.expect($log.error.logs.length).to.equal(0);
      chai.expect(identifyResponse.callCount).to.equal(0);
      chai.expect(registerResponse.callCount).to.equal(1);
      chai.expect(registerResponse.args[0][0]).to.equal(expectedRequestId);
      chai.expect(registerResponse.args[0][1]).to.deep.equal(expectedResponse);
    });
  });

});
