import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { NgZone } from '@angular/core';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { NavigationService } from '@mm-services/navigation.service';
import { AndroidAppLauncherService } from '@mm-services/android-app-launcher.service';

describe('AndroidApi service', () => {

  let service;
  let sessionService;
  let mrdtService;
  let geolocationService;
  let consoleErrorMock;
  let navigationService;
  let androidAppLauncherService;

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

    navigationService = {
      goBack: sinon.stub(),
      goToPrimaryTab: sinon.stub(),
    };

    androidAppLauncherService = {
      resolveAndroidAppResponse: sinon.stub()
    };

    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: GeolocationService, useValue: geolocationService },
        { provide: MRDTService, useValue: mrdtService },
        { provide: NavigationService, useValue: navigationService },
        { provide: AndroidAppLauncherService, useValue: androidAppLauncherService },
      ],
    });

    service = TestBed.inject(AndroidApiService);
  });

  afterEach(() => {
    sinon.restore();
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

  describe('Android App Launcher', () => {
    it('should process response after launching android app', () => {
      const response = {
        status: 'located',
        person: { name: 'Jack', dateOfBirth: '13/05/1995' }
      };

      service.resolveCHTExternalAppResponse(response);

      expect(androidAppLauncherService.resolveAndroidAppResponse.callCount).to.equal(1);
      expect(androidAppLauncherService.resolveAndroidAppResponse.args[0]).to.have.members([response]);
      expect(consoleErrorMock.callCount).to.equal(0);
    });
  });
});
