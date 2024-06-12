import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Contact from '../../src/libs/contact';
import * as Place from '../../src/local/place';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';

describe('local place', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let isPlace: SinonStub;
  let isNormalizedParent: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    isPlace = sinon.stub(contactTypeUtils, 'isPlace');
    isNormalizedParent = sinon.stub(Contact, 'isNormalizedParent');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = { hello: 'world' } as const;

    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns a person by UUID', async () => {
        const doc = { type: 'clinic' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(true);
        isNormalizedParent.returns(true);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(isNormalizedParent.calledOnceWithExactly(doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a place type', async () => {
        const doc = { type: 'not-place' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(false);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(isNormalizedParent.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
      });

      it('returns null if the identified doc does not have a valid normalized parent lineage', async () => {
        const doc = { type: 'clinic' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(true);
        isNormalizedParent.returns(false);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(isNormalizedParent.calledOnceWithExactly(doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPlace.notCalled).to.be.true;
        expect(isNormalizedParent.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No place found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });
  });
});
