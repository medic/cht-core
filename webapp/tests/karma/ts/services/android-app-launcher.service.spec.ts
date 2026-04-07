import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { AndroidAppLauncherService } from '@mm-services/android-app-launcher.service';
import { PerformanceService } from '@mm-services/performance.service';

describe('AndroidAppLauncherService', () => {
  let service: AndroidAppLauncherService;
  const medicMobileAndroid: any = {};
  let originalMedicMobileAndroid;
  let consoleErrorMock;
  let performanceService;
  let trackingStub;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    medicMobileAndroid.launchExternalApp = sinon.stub();
    originalMedicMobileAndroid = window.medicmobile_android;
    window.medicmobile_android = medicMobileAndroid;

    trackingStub = { stop: sinon.stub() };
    performanceService = { track: sinon.stub().returns(trackingStub) };

    TestBed.configureTestingModule({
      providers: [
        { provide: PerformanceService, useValue: performanceService },
      ]
    });
    service = TestBed.inject(AndroidAppLauncherService);
  });

  afterEach(() => {
    window.medicmobile_android = originalMedicMobileAndroid;
    sinon.restore();
  });

  describe('isEnabled()', () => {
    it('should return true if launchAndroidApp function is defined', () => {
      medicMobileAndroid.launchExternalApp = () => {};
      expect(service.isEnabled()).to.equal(true);
    });

    it('should return false if medicmobile_android or launchExternalApp function isnt defined', () => {
      medicMobileAndroid.launchExternalApp = undefined;
      expect(service.isEnabled()).to.equal(false);

      window.medicmobile_android = undefined;
      expect(service.isEnabled()).to.equal(false);
    });
  });

  describe('launchAndroidApp()', () => {
    it('should launch android app with some parameters', () => {
      const androidApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: { city: 'Tokyo' }
        },
      };

      const result = service.launchAndroidApp(androidApp);

      expect(medicMobileAndroid.launchExternalApp.callCount).to.equal(1);
      expect(medicMobileAndroid.launchExternalApp.args[0]).to.have.members([
        'com.my-app.action.LOCATE',
        null,
        null,
        '{"id":"1","location":{"city":"Tokyo"}}',
        null,
        null,
        null,
      ]);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(performanceService.track.callCount).to.equal(1);
    });

    it('should launch android app with all parameters', () => {
      const androidApp = {
        action: 'com.my-app.action.LOCATE',
        category: 'a-category',
        type: 'a-type',
        extras: {
          id: '1',
          location: { city: 'Tokyo' }
        },
        uri: 'https://extample.com/action/locate',
        packageName: 'com.my-app',
        flags: 5,
      };

      const result = service.launchAndroidApp(androidApp);

      expect(medicMobileAndroid.launchExternalApp.callCount).to.equal(1);
      expect(medicMobileAndroid.launchExternalApp.args[0]).to.have.members([
        'com.my-app.action.LOCATE',
        'a-category',
        'a-type',
        '{"id":"1","location":{"city":"Tokyo"}}',
        'https://extample.com/action/locate',
        'com.my-app',
        5,
      ]);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(performanceService.track.callCount).to.equal(1);
    });

    it('should launch android app with all null parameters', () => {
      const result = service.launchAndroidApp({} as any);

      expect(medicMobileAndroid.launchExternalApp.callCount).to.equal(1);
      expect(medicMobileAndroid.launchExternalApp.args[0]).to.have.members([
        null, null, null, null, null, null, null,
      ]);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(performanceService.track.callCount).to.equal(1);
    });

    it('should resolve android app response and stop performance tracking', async () => {
      const androidApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: { city: 'Tokyo' }
        },
      };

      const promise = service.launchAndroidApp(androidApp);

      service.resolveAndroidAppResponse({
        action: 'com.my-app.action.LOCATE',
        status: 'located',
        person: { name: 'Jack' }
      });

      const response = await promise;

      expect(promise instanceof Promise).to.equal(true);
      expect(response).to.deep.equal({
        action: 'com.my-app.action.LOCATE',
        status: 'located',
        person: { name: 'Jack' }
      });
      expect(performanceService.track.callCount).to.equal(1);
      expect(trackingStub.stop.callCount).to.equal(1);
      expect(trackingStub.stop.args[0][0]).to.deep.equal({
        name: 'enketo:external-app:com.my-app.action.LOCATE'
      });
    });

    it('should catch exception when launching android app and reject with message', () => {
      const androidApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: { city: 'Tokyo' }
        },
      };
      medicMobileAndroid.launchExternalApp.throws(new Error('some error'));

      return service
        .launchAndroidApp(androidApp)
        .then(() => assert.fail('Should have thrown exception.'))
        .catch(error => {
          expect(error).to.equal('AndroidAppLauncherService :: Error when launching Android app. ChtAndroidApp=' +
            '{"action":"com.my-app.action.LOCATE","extras":{"id":"1","location":{"city":"Tokyo"}}}, Enabled=true');
          expect(consoleErrorMock.callCount).to.equal(1);
          expect(consoleErrorMock.args[0][1].message).to.equal('some error');
          expect(medicMobileAndroid.launchExternalApp.callCount).to.equal(1);
          expect(medicMobileAndroid.launchExternalApp.args[0]).to.have.members([
            'com.my-app.action.LOCATE',
            null,
            null,
            '{"id":"1","location":{"city":"Tokyo"}}',
            null,
            null,
            null,
          ]);
          expect(trackingStub.stop.callCount).to.equal(0);
        });
    });
  });
});
