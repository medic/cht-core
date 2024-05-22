import * as Doc from '../../../src/libs/doc';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { getDocById } from '../../../src/local/libs/doc';
import { expect } from 'chai';

describe('local doc lib', () => {
  let dbGet: SinonStub;
  let db: PouchDB.Database<Doc.Doc>;
  let isDoc: SinonStub;
  let error: SinonStub;

  beforeEach(() => {
    dbGet = sinon.stub();
    db = { get: dbGet } as unknown as PouchDB.Database<Doc.Doc>;
    isDoc = sinon.stub(Doc, 'isDoc');
    error = sinon.stub(logger, 'error');
  });

  afterEach(() => sinon.restore());

  describe('getDocById', () => {
    it('returns a doc by id', async () => {
      const uuid = 'uuid';
      const doc = { type: 'doc' };
      dbGet.resolves(doc);
      isDoc.returns(true);

      const result = await getDocById(db)(uuid);

      expect(result).to.equal(doc);
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the result is not a doc', async () => {
      const uuid = 'uuid';
      const doc = { type: 'not-doc' };
      dbGet.resolves(doc);
      isDoc.returns(false);

      const result = await getDocById(db)(uuid);

      expect(result).to.be.null;
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the doc is not found', async () => {
      const uuid = 'uuid';
      dbGet.rejects({ status: 404 });

      const result = await getDocById(db)(uuid);

      expect(result).to.be.null;
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
      expect(error.notCalled).to.be.true;
    });

    it('throws an error if an unexpected error occurs', async () => {
      const uuid = 'uuid';
      const err = new Error('unexpected error');
      dbGet.rejects(err);

      await expect(getDocById(db)(uuid)).to.be.rejectedWith(err);

      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
      expect(error.calledOnceWithExactly(`Failed to fetch doc with id [${uuid}]`, err)).to.be.true;
    });
  });
});
