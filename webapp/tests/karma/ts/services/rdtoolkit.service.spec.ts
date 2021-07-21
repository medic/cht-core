import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { RDToolkitService } from '@mm-services/rdtoolkit.service';

describe('RDToolkitService', () => {
  let service: RDToolkitService;
  const medicMobileAndroid: any = {};
  let originalMedicMobileAndroid;
  let consoleErrorMock;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');

    medicMobileAndroid.rdToolkit_provisionRDTest = sinon.stub();
    medicMobileAndroid.rdToolkit_captureRDTest = sinon.stub();

    originalMedicMobileAndroid = window.medicmobile_android;
    window.medicmobile_android = medicMobileAndroid;

    TestBed.configureTestingModule({});
    service = TestBed.inject(RDToolkitService);
  });

  afterEach(() => {
    window.medicmobile_android = originalMedicMobileAndroid;
    sinon.restore();
  });

  describe('enabled()', () => {
    it('should return true if RDToolkit functions are defined', () => {
      medicMobileAndroid.rdToolkit_provisionRDTest = () => {};
      medicMobileAndroid.rdToolkit_captureRDTest = () => {};

      expect(service.enabled()).to.equal(true);
    });

    it('should return false if RDToolkit functions arent defined', () => {
      medicMobileAndroid.rdToolkit_provisionRDTest = undefined;
      medicMobileAndroid.rdToolkit_captureRDTest = () => {};

      expect(service.enabled()).to.equal(false);

      medicMobileAndroid.rdToolkit_provisionRDTest = () => {};
      medicMobileAndroid.rdToolkit_captureRDTest = undefined;

      expect(service.enabled()).to.equal(false);

      window.medicmobile_android = undefined;

      expect(service.enabled()).to.equal(false);
    });
  });

  describe('provision test', () => {
    it('should return promise and provision test', () => {
      const result = service.provisionRDTest(
        'session1',
        'patient1',
        'Anne',
        'mal_pf',
        'https//server'
      );

      expect(medicMobileAndroid.rdToolkit_provisionRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_provisionRDTest.args[0]).to.have.members([
        'session1',
        'patient1',
        'Anne',
        'mal_pf',
        'https//server'
      ]);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should resolve provisioned test', async () => {
      const promise = service.provisionRDTest(
        'session1',
        'patient1',
        'Anne',
        'mal_pf',
        'https//server'
      );

      service.resolveProvisionedTest({
        state: 'RUNNING',
        sessionId: 'session1',
        timeResolved: '12/12/2021 13:20:20',
        timeStarted: '12/12/2021 14:35:00'
      });

      const response = await promise;

      expect(response).to.deep.equal({
        state: 'RUNNING',
        sessionId: 'session1',
        timeResolved: '12/12/2021 13:20:20',
        timeStarted: '12/12/2021 14:35:00'
      });
    });

    it('should catch exception when provisioning test', () => {
      medicMobileAndroid.rdToolkit_provisionRDTest.throws(new Error('some error'));
      service.provisionRDTest(
        'a1',
        'b1',
        'Anne',
        'mal_pf',
        'https//server'
      );

      expect(medicMobileAndroid.rdToolkit_provisionRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_provisionRDTest.args[0]).to.have.members([
        'a1',
        'b1',
        'Anne',
        'mal_pf',
        'https//server'
      ]);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal(
        'Error when provisioning RD Test: ',
        'Error: some error'
      );
    });
  });

  describe('capture test result', () => {
    it('should return promise and capture test result', () => {
      const result = service.captureRDTest('session1');

      expect(medicMobileAndroid.rdToolkit_captureRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_captureRDTest.args[0]).to.have.members(['session1']);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should resolve captured test result', async () => {
      const promise = service.captureRDTest('session1');

      service.resolveCapturedTest({
        results: [{
          result: 'mal_pf_neg',
          test: 'mal_pf'
        }],
        croppedImage: '',
        timeRead: '12/12/2021 13:40:20',
        timeStarted: '12/12/2021 13:10:20',
        timeResolved: '12/12/2021 13:20:20',
        state: 'QUEUED',
        sessionId: 'session1'
      });

      const response = await promise;

      expect(response).to.deep.equal({
        results: [{
          result: 'mal_pf_neg',
          test: 'mal_pf'
        }],
        croppedImage: '',
        timeRead: '12/12/2021 13:40:20',
        timeStarted: '12/12/2021 13:10:20',
        timeResolved: '12/12/2021 13:20:20',
        state: 'QUEUED',
        sessionId: 'session1'
      });
    });

    it('should catch exception when capturing test result', () => {
      medicMobileAndroid.rdToolkit_captureRDTest.throws(new Error('some error'));
      service.captureRDTest('session1');

      expect(medicMobileAndroid.rdToolkit_captureRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_captureRDTest.args[0]).to.have.members(['session1']);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal(
        'Error when capturing RD Test: ',
        'Error: some error'
      );
    });
  });
});
