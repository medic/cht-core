const swRegister = require('../../../src/ts/bootstrapper/swRegister');
const sinon = require('sinon');
const { expect } = require('chai');

let fakeRegisterFunc;

function executeSwLifecycle(registration) {
  setTimeout(() => registration.onupdatefound(), 1);
  setTimeout(() => registration.installing.onstatechange(), 2);
}

describe('Service worker registration (swRegister.js)', () => {
  // ignore "Read Only" jshint error for overwriting `window`
  // jshint -W020
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

  it('resolves on activation', done => {
    const registration = {
      installing: { state: 'activated' },
    };
    fakeRegisterFunc.resolves(registration);

    const callback = sinon.stub();
    swRegister(callback).then(actual => {
      expect(actual).to.be.an('object');
      expect(callback.callCount).to.eq(1);
      done();
    }).catch(err => {
      throw err;
    });
    executeSwLifecycle(registration);
  });

  it('rejects if service workers not supported', done => {
    delete window.navigator.serviceWorker;

    const callback = sinon.stub();
    swRegister(callback).catch(err => {
      expect(callback.called).to.eq(false);
      expect(err).to.include({ name: 'Error' });
      expect(err.message).to.include('not supported');
      done();
    });
  });

  it('rejects on redundant', done => {
    const registration = {
      installing: { state: 'redundant' },
    };
    fakeRegisterFunc.resolves(registration);

    const callback = sinon.stub();
    swRegister(callback).catch(err => {
      expect(err).to.include({ name: 'Error' });
      expect(err.message).to.include('redundant');
      expect(callback.callCount).to.eq(1);
      done();
    });
    executeSwLifecycle(registration);
  });

  it('rejects on error', done => {
    fakeRegisterFunc.rejects('Error');
    const callback = sinon.stub();
    swRegister(callback).catch(err => {
      expect(err).to.include({ name: 'Error' });
      expect(callback.called).to.eq(false);
      done();
    });
  });
});
