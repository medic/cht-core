import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import { Doc } from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';

describe('local person', () => {
  const localContext = {
    medicDb: {} as PouchDB.Database<Doc>,
    settings: { getAll: sinon.stub() }
  };

  afterEach(() => {
    sinon.restore();
    localContext.settings.getAll.reset();
  });

  describe('V1', () => {
    describe('get', () => {
      const identifier = { uuid: 'uuid' };
      const settings = { hello: 'world' };
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let isPerson: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        isPerson = sinon.stub(contactTypeUtils, 'isPerson');
      });

      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        getDocByIdInner.resolves(doc);
        localContext.settings.getAll.returns(settings);
        isPerson.returns(true);

        const result = await Person.V1.get(localContext, identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
      });

      it('returns null if the identified doc is not a person', async () => {
        const doc = { type: 'not-person' };
        getDocByIdInner.resolves(doc);
        localContext.settings.getAll.returns(settings);
        isPerson.returns(false);

        const result = await Person.V1.get(localContext, identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Person.V1.get(localContext, identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(localContext.settings.getAll.notCalled).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });
    });
  });
});
