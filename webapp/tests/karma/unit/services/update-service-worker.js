describe('UpdateServiceWorker Service', () => {
  'use strict';

  let $timeout; let service; let 
    fakeGetReg;

  beforeEach(() => {
    module('inboxApp');
    
    fakeGetReg = sinon.stub().resolves();
    module($provide => {
      $provide.value('$window', {
        navigator: {
          serviceWorker: {
            getRegistrations: fakeGetReg, 
          },
        },
      });
    });
    inject((_UpdateServiceWorker_, _$timeout_) => {
      service = _UpdateServiceWorker_;
      $timeout = _$timeout_;
    });
  });

  afterEach(sinon.restore);

  it('noop when there are no registered service workers', () => {
    fakeGetReg.resolves([]);
    const callback = sinon.stub();
    service(callback);
    expect(callback.called).to.eq(false);
  });

  it('service worker activation invokes callback', done => {
    const registration = {
      installing: { state: 'activated' },
      update: sinon.stub(),
    };
    fakeGetReg.resolves([registration]);
    const callback = sinon.stub();

    service(callback);
    executeSwLifecycle(registration, () => {
      expect(registration.update.callCount).to.eq(1);
      expect(callback.callCount).to.eq(1);
      done();
    });
  });

  it('service worker redundancy + retry invokes callback', done => {
    const registration = {
      installing: { state: 'redundant' },
      update: sinon.stub(),
    };
    fakeGetReg.resolves([registration]);
    const callback = sinon.stub();

    service(callback);

    executeSwLifecycle(registration, () => {
      expect(registration.update.callCount).to.eq(1);
      expect(callback.callCount).to.eq(0);

      registration.installing.state = 'activated';
      $timeout.flush(1000 * 60 * 10);

      executeSwLifecycle(registration, () => {
        expect(registration.update.callCount).to.eq(2);
        expect(callback.callCount).to.eq(1);
        done();
      });
    });
  });

  it('multiple redundant updates result in single retry', done => {
    const registration = {
      installing: { state: 'redundant' },
      update: sinon.stub(),
    };
    fakeGetReg.resolves([registration]);
    const callback = sinon.stub();

    service(callback);
    service(callback);
    service(callback);

    executeSwLifecycle(registration, () => {
      expect(registration.update.callCount).to.eq(3);
      expect(callback.callCount).to.eq(0);

      registration.installing.state = 'activated';
      $timeout.flush(1000 * 60 * 10);

      executeSwLifecycle(registration, () => {
        expect(registration.update.callCount).to.eq(4);
        expect(callback.callCount).to.eq(1);
        done();
      });
    });
  });

  function executeSwLifecycle(registration, callback) {
    setTimeout(() => registration.onupdatefound(), 1);
    setTimeout(() => {
      registration.installing.onstatechange();
      callback();
    }, 2);
  }
});
