import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { UpdateServiceWorkerService } from '@mm-services/update-service-worker.service';

describe('UpdateServiceWorker service', () => {
  let service;
  let windowServiceWorker;

  beforeEach(() => {
    windowServiceWorker = {
      getRegistrations: window.navigator.serviceWorker.getRegistrations
    };

    service = TestBed.inject(UpdateServiceWorkerService);
  });

  afterEach(() => {
    sinon.restore();
    Object.defineProperty(
      window.navigator.serviceWorker,
      'getRegistrations',
      { value: windowServiceWorker.getRegistrations, configurable: true }
    );
  });

  it('should not execute callback when no registered service workers', () => {
    const callback = sinon.stub();
    Object.defineProperty(
      window.navigator.serviceWorker,
      'getRegistrations',
      { value: () => Promise.resolve([]), configurable: true }
    );

    service.update(callback);

    expect(callback.called).to.equal(false);
  });

  it('should execute callback when service worker activated', fakeAsync(() => {
    const callback = sinon.stub();
    const consoleDebug = sinon.stub(console, 'debug');
    const registration: any = {
      installing: { state: 'activated' },
      update: sinon.stub(),
    };
    Object.defineProperty(
      window.navigator.serviceWorker,
      'getRegistrations',
      { value: () => Promise.resolve([registration]), configurable: true }
    );

    service.update(callback);
    tick();
    registration.onupdatefound();
    tick();
    registration.installing.onstatechange();
    tick();

    expect(registration.update.callCount).to.equal(1);
    expect(registration.onupdatefound).to.equal(null);
    expect(callback.callCount).to.equal(1);
    expect(consoleDebug.calledOnceWith('New service worker activated')).to.be.true;
  }));

  it('should retry to execute callback when service worker is marked as redundant', fakeAsync(() => {
    const callback = sinon.stub();
    const registration: any = {
      installing: { state: 'redundant' },
      update: sinon.stub(),
    };
    Object.defineProperty(
      window.navigator.serviceWorker,
      'getRegistrations',
      { value: () => Promise.resolve([registration]), configurable: true }
    );

    service.update(callback);
    tick();
    registration.onupdatefound();
    tick();
    registration.installing.onstatechange();
    tick();

    expect(registration.update.callCount).to.equal(1);
    expect(callback.callCount).to.equal(0);

    registration.installing.state = 'activated';
    tick(5 * 60 * 1000);
    registration.onupdatefound();
    tick();
    registration.installing.onstatechange();
    tick();

    expect(registration.update.callCount).to.equal(2);
    expect(registration.onupdatefound).to.equal(null);
    expect(callback.callCount).to.equal(1);
  }));

  it('should retry the callback once when service worker is marked redundant multiple times', fakeAsync(() => {
    const callback = sinon.stub();
    const registration: any = {
      installing: { state: 'redundant' },
      update: sinon.stub(),
    };
    Object.defineProperty(
      window.navigator.serviceWorker,
      'getRegistrations',
      { value: () => Promise.resolve([registration]), configurable: true }
    );

    service.update(callback);
    service.update(callback);
    service.update(callback);
    tick();
    registration.onupdatefound();
    tick();
    registration.installing.onstatechange();
    tick();

    expect(registration.update.callCount).to.equal(3);
    expect(callback.callCount).to.equal(0);

    registration.installing.state = 'activated';
    tick(5 * 60 * 1000);
    registration.onupdatefound();
    tick();
    registration.installing.onstatechange();
    tick();

    expect(registration.update.callCount).to.equal(4);
    expect(registration.onupdatefound).to.equal(null);
    expect(callback.callCount).to.equal(1);
  }));
});
