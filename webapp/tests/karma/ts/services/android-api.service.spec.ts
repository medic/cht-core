import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SimprintsService } from '@mm-services/simprints.service';
import { RDToolkitService } from '@mm-services/rdtoolkit.service';


describe('AndroidApi service', () => {

  let service;
  let sessionService;
  let router;
  let feedbackService;
  let mrdtService;
  let geolocationService;
  let simprintsService;
  let consoleErrorMock;
  let rdToolkitService;

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

    simprintsService = {
      identifyResponse: sinon.stub(),
      registerResponse: sinon.stub()
    };

    rdToolkitService = {
      resolveProvisionedTest: sinon.stub(),
      resolveCapturedTest: sinon.stub()
    };

    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: GeolocationService, useValue: geolocationService },
        { provide: SimprintsService, useValue: simprintsService },
        { provide: FeedbackService, useValue: feedbackService },
        { provide: Router, useValue: router },
        { provide: MRDTService, useValue: mrdtService },
        { provide: RDToolkitService, useValue: rdToolkitService },
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

  describe('RDToolkit', () => {
    it('should process response after provisioning test with RDToolkit app', () => {
      const response = {
        'state': 'RUNNING',
        'timeStarted': 'Sat Mar 28 17:17:13 GMT+07:00 2021',
        'timeResolved': 'Sat Mar 28 17:45:18 GMT+07:00 2021',
        'sessionId': 'cc571ef2-7778-43a0-8bcf-47f7ea42801c'
      };

      service.rdToolkitProvisionedTestResponse(response);

      expect(rdToolkitService.resolveProvisionedTest.callCount).to.equal(1);
      expect(rdToolkitService.resolveProvisionedTest.args[0]).to.have.members([response]);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should catch exception when processing response after provisioning test with RDToolkit app', () => {
      const response = {
        invalid: 'object'
      };
      rdToolkitService.resolveProvisionedTest.throws(new Error('some error'));

      service.rdToolkitProvisionedTestResponse(response);

      expect(rdToolkitService.resolveProvisionedTest.callCount).to.equal(1);
      expect(rdToolkitService.resolveProvisionedTest.args[0]).to.have.members([response]);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0]).to.have.members([
        'RDToolkit - Error processing response from android app, error: "some error", response:',
        response
      ]);
    });

    it('should process response after capturing test result with RDToolkit app', () => {
      const response = {
        'results': [{
          'result': 'mal_pf_neg',
          'test': 'mal_pf'
        }, {
          'result': 'mal_pv_pos',
          'test': 'mal_pv'
        },{
          'result': 'universal_control_failure',
          'test': 'mal_pv'
        }],
        'croppedImage': '',
        'mainImage': '',
        'timeRead': 'Thu Mar 30 17:52:50 GMT+07:00 2021',
        'state': 'RUNNING',
        'timeStarted': 'Sat Mar 30 17:17:13 GMT+07:00 2021',
        'timeResolved': 'Sat Mar 30 17:45:18 GMT+07:00 2021',
        'sessionId': 'cc571ef2-7778-43a0-8bcf-47f7ea42801c',
      };

      service.rdToolkitCapturedTestResponse(response);

      expect(rdToolkitService.resolveCapturedTest.callCount).to.equal(1);
      expect(rdToolkitService.resolveCapturedTest.args[0]).to.have.members([response]);
      expect(consoleErrorMock.callCount).to.equal(0);
    });


    it('should catch exception when processing response after capturing test result with RDToolkit app', () => {
      const response = {
        invalid: 'object'
      };
      rdToolkitService.resolveCapturedTest.throws(new Error('some error'));

      service.rdToolkitCapturedTestResponse(response);

      expect(rdToolkitService.resolveCapturedTest.callCount).to.equal(1);
      expect(rdToolkitService.resolveCapturedTest.args[0]).to.have.members([response]);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0]).to.have.members([
        'RDToolkit - Error processing response from android app, error: "some error", response:',
        response
      ]);
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
