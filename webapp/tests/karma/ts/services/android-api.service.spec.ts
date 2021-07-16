import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { NgZone } from '@angular/core';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SimprintsService } from '@mm-services/simprints.service';
import { NavigationService } from '@mm-services/navigation.service';

describe('AndroidApi service', () => {

  let service;
  let sessionService;
  let mrdtService;
  let geolocationService;
  let simprintsService;
  let consoleErrorMock;
  let navigationService;

  beforeEach(() => {
    sessionService = {
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub(),
      logout: sinon.stub(),
    };

    mrdtService = {
      respond: sinon.stub(),
      respondTimeTaken: sinon.stub(),
    };

    geolocationService = {
      permissionRequestResolved: sinon.stub()
    };

    simprintsService = {
      identifyResponse: sinon.stub(),
      registerResponse: sinon.stub()
    };

    navigationService = {
      goBack: sinon.stub(),
      goToPrimaryTab: sinon.stub(),
    };

    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: GeolocationService, useValue: geolocationService },
        { provide: SimprintsService, useValue: simprintsService },
        { provide: MRDTService, useValue: mrdtService },
        { provide: NavigationService, useValue: navigationService },
      ],
    });

    service = TestBed.inject(AndroidApiService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('simprintsResponse', () => {
    it('errors when given string id', () => {
      service.v1.simprintsResponse(null, 'hello', null);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal('Unable to parse requestId: "hello"');
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('errors when given invalid response', () => {
      service.v1.simprintsResponse(null, '1', 'not json');
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal(
        'Unable to parse JSON response from android app: "not json"'
      );
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('errors when given unknown request type', () => {
      service.v1.simprintsResponse('query', '1', '{ "id": 153 }');
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal('Unknown request type: "query"');
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('calls identify', () => {
      const expectedRequestId = 55498890;
      const expectedResponse = [
        { id: 153, tier: 'TIER_1' },
        { id: 486, tier: 'TIER_5' }
      ];
      service.v1.simprintsResponse('identify', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(simprintsService.identifyResponse.callCount).to.equal(1);
      expect(simprintsService.identifyResponse.args[0][0]).to.equal(expectedRequestId);
      expect(simprintsService.identifyResponse.args[0][1]).to.deep.equal(expectedResponse);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('calls register', () => {
      const expectedRequestId = 54895590;
      const expectedResponse = { id: 849556216 };
      service.v1.simprintsResponse('register', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(1);
      expect(simprintsService.registerResponse.args[0][0]).to.equal(expectedRequestId);
      expect(simprintsService.registerResponse.args[0][1]).to.deep.equal(expectedResponse);
    });
  });

  describe('logout', () => {
    it('should call sessionService logout', () => {
      service.logout();
      expect(sessionService.logout.callCount).to.equal(1);
    });
  });

  describe('back', () => {
    it('should return true and not navigate to primary tab when navigationService.goBack() is true', () => {
      navigationService.goBack.returns(true);

      const result = service.back();

      expect(result).to.be.true;
      expect(navigationService.goBack.callCount).to.equal(1);
      expect(navigationService.goToPrimaryTab.callCount).to.equal(0);
    });

    it('should return true and navigate to primary tab when navigationService.goBack() is false', () => {
      navigationService.goBack.returns(false);

      const result = service.back();

      expect(result).to.be.true;
      expect(navigationService.goBack.callCount).to.equal(1);
      expect(navigationService.goToPrimaryTab.callCount).to.equal(1);
    });

    it('should always return true and not give back control to android app', () => {
      navigationService.goBack.returns(false);
      navigationService.goToPrimaryTab.returns(false);

      const noNavigation = service.back();

      expect(noNavigation).to.be.true;
      expect(navigationService.goBack.callCount).to.equal(1);
      expect(navigationService.goToPrimaryTab.callCount).to.equal(1);

      sinon.resetHistory();
      navigationService.goBack.returns(false);
      navigationService.goToPrimaryTab.returns(true);

      const navigated = service.back();

      expect(navigated).to.be.true;
      expect(navigationService.goBack.callCount).to.equal(1);
      expect(navigationService.goToPrimaryTab.callCount).to.equal(1);
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
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message.startsWith('Unable to parse JSON response')).to.be.true;
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
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message.startsWith('Unable to parse JSON response')).to.be.true;
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
