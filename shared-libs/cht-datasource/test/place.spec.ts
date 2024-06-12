import * as Place from '../src/place';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Context from '../src/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext } from '../src';

describe('place', () => {
  const dataContext = { } as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;

  beforeEach(() => {
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const place = { _id: 'my-place' } as Place.v1.Place;
      const qualifier = { uuid: place._id } as const;
      let getPlace: SinonStub;

      beforeEach(() => {
        getPlace = sinon.stub();
        adapt.returns(getPlace);
      });

      it('retrieves the place for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getPlace.resolves(place);

        const result = await Place.v1.get(dataContext)(qualifier);

        expect(result).to.equal(place);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.get, Remote.Place.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPlace.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Place.v1.get(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.get, Remote.Place.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPlace.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Place.v1.get(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getPlace.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const place = { _id: 'my-place' } as Place.v1.Place;
      const qualifier = { uuid: place._id } as const;
      let getPlaceWithLineage: SinonStub;

      beforeEach(() => {
        getPlaceWithLineage = sinon.stub();
        adapt.returns(getPlaceWithLineage);
      });

      it('retrieves the place with lineage for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getPlaceWithLineage.resolves(place);

        const result = await Place.v1.getWithLineage(dataContext)(qualifier);

        expect(result).to.equal(place);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Place.v1.getWithLineage,
          Remote.Place.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPlaceWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Place.v1.getWithLineage(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Place.v1.getWithLineage,
          Remote.Place.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPlaceWithLineage.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Place.v1.getWithLineage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getPlaceWithLineage.notCalled).to.be.true;
      });
    });
  });
});
