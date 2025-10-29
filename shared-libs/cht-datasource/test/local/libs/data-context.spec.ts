import { expect } from 'chai';
import {
  getLocalDataContext,
  isLocalDataContext,
  SettingsService,
  SourceDatabases,
  isOffline
} from '../../../src/local/libs/data-context';
import { DataContext } from '../../../src';
import * as LocalDoc from '../../../src/local/libs/doc';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../../src/libs/doc';

describe('local context lib', () => {
  describe('isLocalDataContext', () => {
    ([
      [ { medicDb: {}, settings: {} }, true ],
      [ { medicDb: {}, settings: {}, hello: 'world' }, true ],
      [ { medicDb: {} }, false ],
      [ { settings: {} }, false ],
      [ {}, false ]
    ] as [ DataContext, boolean ][]).forEach(([ context, expected ]) => {
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

  describe('isOffline', () => {
    let ddocExistsStub: SinonStub;
    let db: PouchDB.Database<Doc>;
    let dbGet: SinonStub;
    let dbAllDocs: SinonStub;
    let dbQuery: SinonStub;

    beforeEach(() => {
      dbGet = sinon.stub();
      dbAllDocs = sinon.stub();
      dbQuery = sinon.stub();
      db = {
        get: dbGet,
        allDocs: dbAllDocs,
        query: dbQuery
      } as unknown as PouchDB.Database<Doc>;
      ddocExistsStub = sinon.stub(LocalDoc, 'ddocExists');
    });

    afterEach(() => sinon.restore());
    
    it('should return true when the offline design doc exists', async () => {
      // Arrange
      ddocExistsStub.withArgs(db, '_design/medic-offline-freetext').resolves(true);

      // Act
      const result = await isOffline(db);

      // Assert
      expect(result).to.be.true;
      expect(ddocExistsStub.calledOnce).to.be.true;
      expect(ddocExistsStub.calledWith(db, '_design/medic-offline-freetext')).to.be.true;
    });

    it('should return false when the offline design doc does not exist', async () => {
      // Arrange
      ddocExistsStub.withArgs(db, '_design/medic-offline-freetext').resolves(false);

      // Act
      const result = await isOffline(db);

      // Assert
      expect(result).to.be.false;
      expect(ddocExistsStub.calledOnce).to.be.true;
      expect(ddocExistsStub.calledWith(db, '_design/medic-offline-freetext')).to.be.true;
    });

    it('should propagate errors from ddocExists', async () => {
      // Arrange
      const error = new Error('Database error');
      ddocExistsStub.withArgs(db, '_design/medic-offline-freetext').rejects(error);

      // Act & Assert
      await expect(isOffline(db)).to.be.rejectedWith(error);
      expect(ddocExistsStub.calledOnce).to.be.true;
    });
  });
});
