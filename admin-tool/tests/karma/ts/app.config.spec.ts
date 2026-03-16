import { APP_INITIALIZER } from '@angular/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { appConfig } from '../../../src/ts/app.config';

describe('appConfig', () => {
  it('should be defined', () => {
    expect(appConfig).to.exist;
  });

  it('should have a providers array', () => {
    expect(appConfig.providers).to.be.an('array');
  });

  it('should have at least one provider configured', () => {
    expect(appConfig.providers.length).to.be.greaterThan(0);
  });

  it('should include APP_INITIALIZER for session', () => {
    const initProvider = appConfig.providers.find(
      (p: any) => p && p.provide === APP_INITIALIZER
    );
    expect(initProvider).to.exist;
  });

  it('initSession factory should return a function that calls session.init', () => {
    const initProvider: any = appConfig.providers.find(
      (p: any) => p && p.provide === APP_INITIALIZER
    );
    const sessionStub = { init: sinon.stub().resolves() };
    const factory = initProvider.useFactory;
    const initFn = factory(sessionStub);
    expect(initFn).to.be.a('function');
    initFn();
    expect(sessionStub.init.callCount).to.equal(1);
    sinon.restore();
  });
});
