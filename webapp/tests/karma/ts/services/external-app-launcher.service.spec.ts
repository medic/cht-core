import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ExternalAppLauncherService } from '@mm-services/external-app-launcher.service';

describe('ExternalAppLauncherService', () => {
  let service: ExternalAppLauncherService;
  const medicMobileAndroid: any = {};
  let originalMedicMobileAndroid;
  let consoleErrorMock;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    medicMobileAndroid.launchExternalApp = sinon.stub();
    originalMedicMobileAndroid = window.medicmobile_android;
    window.medicmobile_android = medicMobileAndroid;

    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalAppLauncherService);
  });

  afterEach(() => {
    window.medicmobile_android = originalMedicMobileAndroid;
    sinon.restore();
  });

  describe('isEnabled()', () => {
    it('should return true if launchExternalApp function is defined', () => {
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

  describe('launchExternalApp()', () => {
    it('should launch external app with some parameters', () => {
      const externalApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: {
            city: 'Tokyo'
          }
        },
      };

      const result = service.launchExternalApp(externalApp);

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
    });

    it('should launch external app with all parameters', () => {
      const externalApp = {
        action: 'com.my-app.action.LOCATE',
        category: 'a-category',
        type: 'a-type',
        extras: {
          id: '1',
          location: {
            city: 'Tokyo'
          }
        },
        uri: 'https://extample.com/action/locate',
        packageName: 'com.my-app',
        flags: 5,
      };

      const result = service.launchExternalApp(externalApp);

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
    });

    it('should launch external app with all null parameters', () => {
      const result = service.launchExternalApp({} as any);

      expect(medicMobileAndroid.launchExternalApp.callCount).to.equal(1);
      expect(medicMobileAndroid.launchExternalApp.args[0]).to.have.members([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should resolve external app response', async () => {
      const externalApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: {
            city: 'Tokyo'
          }
        },
      };

      const promise = service.launchExternalApp(externalApp);

      service.resolveExternalAppResponse({
        status: 'located',
        person: { name: 'Jack' }
      });

      const response = await promise;

      expect(response).to.deep.equal({
        status: 'located',
        person: { name: 'Jack' }
      });
    });

    it('should catch exception when launching external app', () => {
      const externalApp = {
        action: 'com.my-app.action.LOCATE',
        extras: {
          id: '1',
          location: {
            city: 'Tokyo'
          }
        },
      };
      medicMobileAndroid.launchExternalApp.throws(new Error('some error'));

      service.launchExternalApp(externalApp);

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
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal(
        'ExternalAppLauncherService :: Error when launching external app. ' +
        'ChtExternalApp={"action":"com.my-app.action.LOCATE","extras":{"id":"1","location":{"city":"Tokyo"}}},' +
        ' Enabled=true',
        'Error: some error'
      );
    });
  });
});
