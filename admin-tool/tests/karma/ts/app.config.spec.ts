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
});
