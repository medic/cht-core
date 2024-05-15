import { expect } from 'chai';
import {
  assertDataContext,
  getLocalDataContext,
  getRemoteDataContext,
  isLocalDataContext,
  SettingsService,
  SourceDatabases
} from '../../src/libs/context';

describe('context lib', () => {
  describe('isLocalDataContext', () => {
    [
      [{ medicDb: {}, settings: {} }, true],
      [{ medicDb: {}, settings: {}, hello: 'world' }, true],
      [{ medicDb: {} }, false],
      [{ settings: {} }, false],
      [{}, false]
    ].forEach(([context, expected]) => {
      it(`evaluates ${JSON.stringify(context)}`, () => {
        expect(isLocalDataContext(context)).to.equal(expected);
      });
    });
  });

  describe('assertDataContext', () => {
    it('successfully asserts a data context', () => {
      expect(() => assertDataContext({ medicDb: {}, settings: {} })).to.not.throw();
    });

    [
      null,
      1,
      'hello'
    ].forEach((context) => {
      it(`throws an error if the data context is invalid [${JSON.stringify(context)}]`, () => {
        expect(() => assertDataContext(context)).to.throw(`Invalid data context [${JSON.stringify(context)}].`);
      });
    });
  });

  describe('getLocalDataContext', () => {
    const settingsService = { getAll: () => ({}) } as SettingsService;
    const sourceDatabases = { medic: {} } as SourceDatabases;

    [
      null,
      {},
      { getAll: 'not a function' },
      'hello'
    ].forEach((settings) => {
      const settingsService = settings as unknown as SettingsService;

      it('throws an error if the settings service is invalid', () => {
        expect(() => getLocalDataContext(settingsService, sourceDatabases))
          .to.throw(`Invalid settings service [${JSON.stringify(settingsService)}].`);
      });
    });

    [
      null,
      {},
      { medic: () => 'a function' },
      'hello'
    ].forEach((sourceDbs) => {
      const sourceDatabases = sourceDbs as unknown as SourceDatabases;

      it('throws an error if the source databases are invalid', () => {
        expect(() => getLocalDataContext(settingsService, sourceDatabases))
          .to.throw(`Invalid source databases [${JSON.stringify(sourceDatabases)}].`);
      });
    });

    it('returns the local data context', () => {
      const dataContext = getLocalDataContext(settingsService, sourceDatabases);
      expect(dataContext).to.deep.equal({ medicDb: sourceDatabases.medic, settings: settingsService });
    });
  });

  it('getRemoteDataContext', () => {
    expect(getRemoteDataContext()).to.deep.equal({});
  });
});
