import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { Router } from '@angular/router';
import { MRDTService } from '@mm-services/mrdt.service';
import { NgZone } from '@angular/core';

describe('AndroidApi service', () => {

  let service;
  //let identifyResponse;
  //let registerResponse;
  let sessionService;
  let router;
  let feedbackService;
  let mrdtService;
  let geolocationService;

  beforeEach(() => {
    sessionService = {
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub(),
      logout: sinon.stub(),
    };

    router = {
      navigate: sinon.stub(),
      routerState: {
        root: {
          snapshot: {  }
        }
      }
    };

    feedbackService = {
      init: sinon.stub(),
      submit: sinon.stub(),
    };

    mrdtService = {
      respond: sinon.stub(),
      respondTimeTaken: sinon.stub(),
    };

    geolocationService = {
      permissionRequestResolved: sinon.stub()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: GeolocationService, useValue: geolocationService },
        // todo simprints
        { provide: FeedbackService, useValue: feedbackService },
        { provide: Router, useValue: router },
        { provide: MRDTService, useValue: mrdtService },
      ],
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

  describe('logout', () => {
    it('should call sessionService logout', () => {
      service.logout();
      expect(sessionService.logout.callCount).to.equal(1);
    });
  });

  describe('back', () => {
    it('should route to contacts from deceased', () => {
      router.routerState.root.snapshot = {
        data: { name: 'contacts.deceased' },
        params: { id: 'my-contact-id' },
      };
      service.back();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'my-contact-id']]);
    });

    it('should route to contacts from contact detail', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-contact-id' },
        parent: { routeConfig: { path: 'contacts' } },
      };
      service.back();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'contacts']]);
    });

    it('should route to reports from report detail', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-report-id' },
        parent: { routeConfig: { path: 'reports' } },
      };
      service.back();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'reports']]);
    });

    it('should route to reports from random child route', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-random-id' },
        parent: { routeConfig: { path: 'something' } },
      };
      service.back();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'something']]);
    });

    it('should handle other routes', () => {
      feedbackService.submit.resolves();
      service.back();
      // this test is temporary
      // issue: https://github.com/medic/cht-core/issues/6698
      expect(feedbackService.submit.callCount).to.equal(1);
      expect(feedbackService.submit.args[0]).to.deep.equal(
        ['Attempt to back to an undefined state [AndroidApi.back()]']
      );
    });
  });

  describe('mrdtResponse', () => {
    it('should call mrdt.respond with parsed json', () => {
      const response = JSON.stringify({ some: 'response' });
      service.mrdtResponse(response);
      expect(mrdtService.respond.callCount).to.equal(1);
      expect(mrdtService.respond.args[0]).to.deep.equal([{ some: 'response' }]);
    });

    it('should catch parse errors', () => {
      const response = '{ this:  }is not valid json';
      service.mrdtResponse(response);
      expect(mrdtService.respond.callCount).to.equal(0);
    });
  });

  describe('mrdtTimeTakenResponse', () => {
    it('should call mrdt.respondTimeTaken with parsed json', () => {
      const response = JSON.stringify({ some: 'response' });
      service.mrdtTimeTakenResponse(response);
      expect(mrdtService.respondTimeTaken.callCount).to.equal(1);
      expect(mrdtService.respondTimeTaken.args[0]).to.deep.equal([{ some: 'response' }]);
    });

    it('should catch parse errors', () => {
      const response = '{ this:  }is not valid json';
      service.mrdtTimeTakenResponse(response);
      expect(mrdtService.respondTimeTaken.callCount).to.equal(0);
    });
  });

  describe('locationPermissionRequestResolve', () => {
    it('should call geolocation permissionRequestResolved', () => {
      service.locationPermissionRequestResolve();
      expect(geolocationService.permissionRequestResolved.callCount).to.equal(1);
    });
  });

  describe('v1 api runs everything in zone', () => {
    let ngZoneRun;
    beforeEach(() => {
      ngZoneRun = sinon.stub(NgZone.prototype, 'run').callsArg(0);
    });

    it('should not run in zone if already in zone', () => {
      sinon.stub(NgZone, 'isInAngularZone').returns(true);
      service.v1.logout();
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(0);
      expect(sessionService.logout.callCount).to.equal(1);
    });

    it('should run in zone if not already in zone', () => {
      sinon.stub(NgZone, 'isInAngularZone').returns(false);
      service.v1.logout();
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(1);
      expect(sessionService.logout.callCount).to.equal(1);
    });

    it('should pass parameters correctly when in zone', () => {
      sinon.stub(console, 'debug');
      sinon.stub(NgZone, 'isInAngularZone').returns(true);
      service.v1.smsStatusUpdate('the_id', 'the_dest', 'the_content', 'the_status', 'the_detail');
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(0);
      //@ts-ignore
      expect(console.debug.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.args[0]).to.deep.equal([
        'smsStatusUpdate() :: ' +
        ' id=the_id,' +
        ' destination=the_dest,' +
        ' content=the_content,' +
        ' status=the_status,' +
        ' detail=the_detail'
      ]);
    });

    it('should pass parameters correctly when outside zone', () => {
      sinon.stub(console, 'debug');
      sinon.stub(NgZone, 'isInAngularZone').returns(false);
      service.v1.smsStatusUpdate('an_id', 'a_dest', 'a_content', 'a_status', 'a_detail');
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.args[0]).to.deep.equal([
        'smsStatusUpdate() :: ' +
        ' id=an_id,' +
        ' destination=a_dest,' +
        ' content=a_content,' +
        ' status=a_status,' +
        ' detail=a_detail'
      ]);
    });
  });
});
