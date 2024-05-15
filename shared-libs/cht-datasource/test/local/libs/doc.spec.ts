import * as Doc from '../../../src/libs/doc';
import sinon, { SinonStub } from 'sinon';
import { getDocById } from '../../../src/local/libs/doc';
import { expect } from 'chai';

describe('local doc lib', () => {
  const db = { get: sinon.stub() };
  const pouchDb = db as unknown as PouchDB.Database<Doc.Doc>;
  let isDoc: SinonStub;

  beforeEach(() => {
    isDoc = sinon.stub(Doc, 'isDoc');
  });

  afterEach(() => {
    sinon.restore();
    db.get.reset();
  });

  describe('getDocById', () => {
    it('returns a doc by id', async () => {
      const uuid = 'uuid';
      const doc = { type: 'doc' };
      db.get.resolves(doc);
      isDoc.returns(true);

      const result = await getDocById(pouchDb)(uuid);

      expect(result).to.equal(doc);
      expect(db.get.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the result is not a doc', async () => {
      const uuid = 'uuid';
      const doc = { type: 'not-doc' };
      db.get.resolves(doc);
      isDoc.returns(false);

      const result = await getDocById(pouchDb)(uuid);

      expect(result).to.be.null;
      expect(db.get.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the doc is not found', async () => {
      const uuid = 'uuid';
      db.get.rejects({ status: 404 });

      const result = await getDocById(pouchDb)(uuid);

      expect(result).to.be.null;
      expect(db.get.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
    });

    it('throws an error if an unexpected error occurs', async () => {
      const uuid = 'uuid';
      db.get.rejects(new Error('unexpected error'));

      await expect(getDocById(pouchDb)(uuid)).to.be.rejectedWith('unexpected error');

      expect(db.get.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
    });
  });
});
