import * as Place from '../src/place';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Input from '../src/input';
import * as Context from '../src/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext, Page } from '../src';
import * as Core from '../src/libs/core';
import { fakeGenerator } from './utils';

describe('place', () => {
  const dataContext = { bind: () => null } as DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isContactTypeQualifier: SinonStub;

  beforeEach(() => {
    dataContextBind = sinon.stub(dataContext, 'bind');
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isContactTypeQualifier = sinon.stub(Qualifier, 'isContactTypeQualifier');
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

    // The cursor/limit/qualifier validation, defaults and delegation are exercised once against the shared
    // factory in test/libs/paginated.spec.ts. These tests only assert the per-noun wiring.
    describe('getPage', () => {
      const cursor = '1';
      const pageData = { data: [{ _id: 'place1' }, { _id: 'place2' }] as Place.v1.Place[], cursor };
      const placeTypeQualifier = { contactType: 'place' } as const;
      const invalidQualifier = { contactType: 'invalid' } as const;
      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub().resolves(pageData);
        adapt.returns(getPage);
      });

      it('delegates to the doc-page local/remote implementations', async () => {
        isContactTypeQualifier.returns(true);

        const result = await Place.v1.getPage(dataContext)(placeTypeQualifier, cursor, 3);

        expect(result).to.equal(pageData);
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(placeTypeQualifier, cursor, 3)).to.be.true;
      });

      it('defaults to the docs page limit', async () => {
        isContactTypeQualifier.returns(true);

        await Place.v1.getPage(dataContext)(placeTypeQualifier);

        expect(getPage.calledOnceWithExactly(placeTypeQualifier, null, 100)).to.be.true;
      });

      it('validates with the contact-type qualifier assertion', async () => {
        isContactTypeQualifier.returns(false);

        await expect(Place.v1.getPage(dataContext)(invalidQualifier))
          .to.be.rejectedWith(`Invalid contact type [${JSON.stringify(invalidQualifier)}].`);
        expect(getPage.notCalled).to.be.true;
      });
    });

    describe('getAll', () => {
      const placeTypeQualifier = { contactType: 'place' } as const;
      const mockGenerator = {} as AsyncGenerator<Place.v1.Place, null>;
      let placeGetPage: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        placeGetPage = sinon.stub(Place.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(placeGetPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      });

      it('drains the doc-page getter into a generator', () => {
        isContactTypeQualifier.returns(true);

        const generator = Place.v1.getAll(dataContext)(placeTypeQualifier);

        expect(generator).to.equal(mockGenerator);
        expect(getPagedGenerator.calledOnceWithExactly(placeGetPage, placeTypeQualifier)).to.be.true;
      });

      it('validates with the contact-type qualifier assertion', () => {
        isContactTypeQualifier.returns(false);

        expect(() => Place.v1.getAll(dataContext)(placeTypeQualifier))
          .to.throw(`Invalid contact type [${JSON.stringify(placeTypeQualifier)}].`);
        expect(getPagedGenerator.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      let createPlaceDoc: SinonStub;

      beforeEach(() => {
        createPlaceDoc = sinon.stub();
        adapt.returns(createPlaceDoc);
      });


      it('returns place doc for valid input', async () => {
        const input = {
          name: 'place-1',
          type: 'place',
        };
        const doc = {
          ...input,
          _id: 'new-doc'
        };
        createPlaceDoc.resolves(doc);

        const result = await Place.v1.create(dataContext)(input);

        expect(result).to.equal(doc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.create, Remote.Place.v1.create))
          .to.be.true;
        expect(createPlaceDoc.calledOnceWithExactly(input)).to.be.true;
      });

      it('Throws error is input is not a record', async () => {
        const input = 'hello' as unknown as Input.v1.PlaceInput;
        await expect(Place.v1.create(dataContext)(input))
          .to.be.rejectedWith(`Place data not provided.`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.create, Remote.Place.v1.create))
          .to.be.true;
        expect(createPlaceDoc.notCalled).to.be.true;
      });
    });

    describe('update', () => {
      let updatePlaceDoc: SinonStub;

      beforeEach(() => {
        updatePlaceDoc = sinon.stub();
        adapt.returns(updatePlaceDoc);
      });

      it('returns updated place doc for valid input', async () => {
        const updateInput = {
          name: 'place-1',
          type: 'place',
          _id: '123',
          _rev: '1-abc',
          reported_date: 12312312
        };
        const expectedDoc = {
          ...updateInput,
          _rev: '2.def'
        };
        updatePlaceDoc.resolves(expectedDoc);

        const result = await Place.v1.update(dataContext)(updateInput);

        expect(result).to.equal(expectedDoc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.update, Remote.Place.v1.update))
          .to.be.true;
        expect(updatePlaceDoc.calledOnceWithExactly(updateInput)).to.be.true;
      });

      it('throws error for invalid input', async () => {
        const updateInput = 'my-updated-place';

        await expect(Place.v1.update(dataContext)(updateInput as unknown as Input.v1.UpdatePlaceInput<Place.v1.Place>))
          .to.be.rejectedWith('Updated place data not provided.');

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.update, Remote.Place.v1.update))
          .to.be.true;
        expect(updatePlaceDoc.notCalled).to.be.true;
      });
    });

    describe('getDatasource', () => {
      let place: Place.v1.Datasource;

      beforeEach(() => place = Place.v1.getDatasource(dataContext));

      it('contains expected keys', () => {
        expect(place).to.have.all.keys([
          'getByType', 'getByUuid', 'getByUuidWithLineage', 'getPageByType', 'create', 'update'
        ]);
      });

      it('getByUuid', async () => {
        const expectedPlace = {};
        const placeGet = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeGet);
        const qualifier = { uuid: 'my-places-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPlace = await place.getByUuid(qualifier.uuid);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedPlace = {};
        const placeGet = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeGet);
        const qualifier = { uuid: 'my-places-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPlace = await place.getByUuidWithLineage(qualifier.uuid);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getPageByType', async () => {
        const expectedPlaces: Page<Place.v1.Place> = { data: [], cursor: null };
        const placeGetPage = sinon.stub().resolves(expectedPlaces);
        dataContextBind.returns(placeGetPage);
        const placeType = 'place';
        const limit = 2;
        const cursor = '1';
        const placeTypeQualifier = { contactType: placeType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const returnedPlaces = await place.getPageByType(placeType, cursor, limit);

        expect(returnedPlaces).to.equal(expectedPlaces);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getPage)).to.be.true;
        expect(placeGetPage.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(byContactType.calledOnceWithExactly(placeType)).to.be.true;
      });

      it('getPageByType uses default cursor and limit', async () => {
        const expectedPlaces: Page<Place.v1.Place> = {data: [], cursor: null};
        const placeGetPage = sinon.stub().resolves(expectedPlaces);
        dataContextBind.returns(placeGetPage);
        const placeType = 'place';
        const placeTypeQualifier = { contactType: placeType };
        sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const returnedPlaces = await place.getPageByType(placeType);

        expect(returnedPlaces).to.equal(expectedPlaces);
        expect(placeGetPage.calledOnceWithExactly(placeTypeQualifier, null, 100)).to.be.true;
      });

      it('getByType', () => {
        const mockAsyncGenerator = fakeGenerator();

        const placeGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(placeGetAll);
        const placeType = 'place';
        const placeTypeQualifier = { contactType: placeType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const res = place.getByType(placeType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getAll)).to.be.true;
        expect(placeGetAll.calledOnceWithExactly(placeTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(placeType)).to.be.true;
      });

      it('create', async () => {
        const placeInput = { name: 'p1', type: 'place' };
        const expectedPlace = {
          ...placeInput,
          reported_date: 12312312
        };
        const placeCreate = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeCreate);

        const returnedPlace = await place.create(placeInput);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.create)).to.be.true;
        expect(placeCreate.calledOnceWithExactly(placeInput)).to.be.true;
      });

      it('update', async () => {
        const placeInput = { name: 'p1', type: 'place', _id: '123', _rev: '1-abc' };
        const expectedPlace = {
          ...placeInput,
          reported_date: 12312312
        };
        const placeUpdate = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeUpdate);

        const returnedPlace = await place.update(placeInput);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.update)).to.be.true;
        expect(placeUpdate.calledOnceWithExactly(placeInput)).to.be.true;
      });
    });
  });
});
