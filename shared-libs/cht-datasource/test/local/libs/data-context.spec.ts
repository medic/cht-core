import { expect } from 'chai';
import {
  getLocalDataContext,
  isLocalDataContext,
  SettingsService,
  SourceDatabases
} from '../../../src/local/libs/data-context';
import { DataContext } from '../../../src';

describe('local context lib', () => {
  describe('isLocalDataContext', () => {
    ([
      [{ medicDb: {}, settings: {} }, true],
      [{ medicDb: {}, settings: {}, hello: 'world' }, true],
      [{ medicDb: {} }, false],
      [{ settings: {} }, false],
      [{}, false]
    ] as [DataContext, boolean][]).forEach(([context, expected]) => {
      it(`evaluates ${JSON.stringify(context)}`, () => {
        expect(isLocalDataContext(context)).to.equal(expected);
      });
    });
  });

  describe('getLocalDataContext', () => {
    const settingsService = { getAll: () => ({}) } as SettingsService;
    const sourceDatabases = { medic: {} } as SourceDatabases;

    ([
      null,
      {},
      { getAll: 'not a function' },
      'hello'
    ] as unknown as SettingsService[]).forEach((settingsService) => {
      it('throws an error if the settings service is invalid', () => {
        expect(() => getLocalDataContext(settingsService, sourceDatabases))
          .to.throw(`Invalid settings service [${JSON.stringify(settingsService)}].`);
      });
    });

    ([
      null,
      {},
      { medic: () => 'a function' },
      'hello'
    ] as unknown as SourceDatabases[]).forEach((sourceDatabases) => {
      it('throws an error if the source databases are invalid', () => {
        expect(() => getLocalDataContext(settingsService, sourceDatabases))
          .to.throw(`Invalid source databases [${JSON.stringify(sourceDatabases)}].`);
      });
    });

    it('returns the local data context', () => {
      const dataContext = getLocalDataContext(settingsService, sourceDatabases);
      expect(dataContext).to.deep.include({ medicDb: sourceDatabases.medic, settings: settingsService });
    });
  });
});
