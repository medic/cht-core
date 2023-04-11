const swRegister = require('../../../src/js/bootstrapper/swRegister');
const sinon = require('sinon');
const { expect } = require('chai');

let fakeRegisterFunc;

const executeSwLifecycle = (registration) => {
  setTimeout(() => registration.installing.onstatechange(), 2);
};

describe('Bootstrap Service worker registration (swRegister.js)', () => {
  beforeEach(() => {
    fakeRegisterFunc = sinon.stub().resolves({
      installing: 'something',
    });

    window = {
      navigator: {
        serviceWorker: {
          register: fakeRegisterFunc,
        },
      },
    };
  });

  it('resolves if already installed', () => {
    fakeRegisterFunc.resolves({});
    const callback = sinon.stub();
    return swRegister(callback).then(actual => {
      expect(actual).to.eq(undefined);
      expect(callback.called).to.eq(false);
    });
  });

  it('resolves on activation', () => {
    const registration = {
      installing: { state: 'activated' },
    };
    fakeRegisterFunc.resolves(registration);

    const callback = sinon.stub();
    const promise = swRegister(callback).then(actual => {
      expect(actual).to.be.an('object');
      expect(callback.callCount).to.eq(1);
    });

    executeSwLifecycle(registration);
    return promise;
  });

  it('rejects if service workers not supported', () => {
    delete window.navigator.serviceWorker;

    const callback = sinon.stub();
    return swRegister(callback)
      .then(() => expect.fail('should have rejected'))
      .catch(err => {
        expect(callback.called).to.eq(false);
        expect(err).to.include({ name: 'Error' });
        expect(err.message).to.include('not supported');
      });
  });

  it('rejects on redundant', () => {
    const registration = {
      installing: { state: 'redundant' },
    };
    fakeRegisterFunc.resolves(registration);

    const callback = sinon.stub();
    const promise = swRegister(callback)
      .then(() => expect.fail('should have rejected'))
      .catch(err => {
        expect(err).to.include({ name: 'Error' });
        expect(err.message).to.include('redundant');
        expect(callback.callCount).to.eq(1);
      });
    executeSwLifecycle(registration);
    return promise;
  });

  it('rejects on error', () => {
    fakeRegisterFunc.rejects('Error');
    const callback = sinon.stub();
    return swRegister(callback)
      .then(() => expect.fail('should have rejected'))
      .catch(err => {
        expect(err).to.include({ name: 'Error' });
        expect(callback.called).to.eq(false);
      });
  });
});
