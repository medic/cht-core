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

  describe('provisionRDTest()', () => {
    it('should return promise and provision test', () => {
      const result = service.provisionRDTest(
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
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
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

  describe('captureRDTest()', () => {
    it('should return promise and capture test result', () => {
      const result = service.captureRDTest('a1');

      expect(medicMobileAndroid.rdToolkit_captureRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_captureRDTest.args[0]).to.have.members(['a1']);
      expect(result instanceof Promise).to.equal(true);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should catch exception when capturing test result', () => {
      medicMobileAndroid.rdToolkit_captureRDTest.throws(new Error('some error'));
      service.captureRDTest('a1');

      expect(medicMobileAndroid.rdToolkit_captureRDTest.callCount).to.equal(1);
      expect(medicMobileAndroid.rdToolkit_captureRDTest.args[0]).to.have.members(['a1']);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal(
        'Error when capturing RD Test: ',
        'Error: some error'
      );
    });
  });

  it('should resolve the response after provisioning test', () => {
    service.provisionRDTest(
      'a1',
      'b1',
      'Anne',
      'mal_pf',
      'https//server'
    );
    const provisionTestResolve = sinon.spy(service, 'provisionTestResolve');

    service.resolveProvisionedTest({ sessionId: 'a1' });

    expect(provisionTestResolve.callCount).to.equal(1);
    expect(provisionTestResolve.args[0][0]).to.deep.equal({ sessionId: 'a1' });
  });

  it('should resolve the response after capturing response test', () => {
    service.captureRDTest('a1');
    const captureTestResolve = sinon.spy(service, 'captureTestResolve');

    service.resolveCapturedTest({ sessionId: 'a1' });

    expect(captureTestResolve.callCount).to.equal(1);
    expect(captureTestResolve.args[0][0]).to.deep.equal({ sessionId: 'a1' });
  });
});
