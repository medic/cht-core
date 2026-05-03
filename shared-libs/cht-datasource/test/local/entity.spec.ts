import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import * as Entity from '../../src/local/entity';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';

describe('local entity', () => {
  let localContext: LocalDataContext;

  beforeEach(() => {
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
    } as unknown as LocalDataContext;
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns an entity by UUID', async () => {
        const doc = { type: 'some_type', _id: 'uuid', _rev: '1' };
        getDocByIdInner.resolves(doc);

        const result = await Entity.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Entity.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });
  });
});
