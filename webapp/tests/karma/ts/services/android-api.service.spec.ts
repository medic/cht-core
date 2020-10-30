import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { FeedbackService } from '@mm-services/feedback.service';

describe('AndroidApi service', () => {

  let service;
  let identifyResponse;
  let registerResponse;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() } },
        { provide: GeolocationService, useValue: { permissionRequestResolved: sinon.stub() } },
        // todo simprints
        { provide: FeedbackService, useValue: { init: sinon.stub(), submit: sinon.stub() } },
      ]
    });

    service = TestBed.inject(AndroidApiService);
  });

  afterEach(() => {
    sinon.restore();
  });
  // todo migrate when simprints service has been migrated
/*
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
*/
});
