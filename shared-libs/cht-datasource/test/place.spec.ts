import * as Place from '../src/place';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Input from '../src/input';
import * as Context from '../src/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext } from '../src';
import * as Core from '../src/libs/core';

describe('place', () => {
  const dataContext = {} as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isContactTypeQualifier: SinonStub;
  let isPlaceInput: SinonStub;

  beforeEach(() => {
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isContactTypeQualifier = sinon.stub(Qualifier, 'isContactTypeQualifier');
    isPlaceInput = sinon.stub(Input.v1, 'isPlaceInput');
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

    describe('getPage', () => {
      const places = [ { _id: 'place1' }, { _id: 'place2' }, { _id: 'place3' } ] as Place.v1.Place[];
      const cursor = '1';
      const pageData = { data: places, cursor };
      const limit = 3;
      const stringifiedLimit = '3';
      const placeTypeQualifier = { contactType: 'place' } as const;
      const invalidQualifier = { contactType: 'invalid' } as const;
      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub();
        adapt.returns(getPage);
      });

      it('retrieves places from the data context when cursor is null', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Place.v1.getPage(dataContext)(placeTypeQualifier, null, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(placeTypeQualifier, null, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((placeTypeQualifier))).to.be.true;
      });

      it('retrieves places from the data context when cursor is not null', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Place.v1.getPage(dataContext)(placeTypeQualifier, cursor, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((placeTypeQualifier))).to.be.true;
      });

      it('retrieves places from the data context when cursor is not null and ' +
        'limit is stringified number', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Place.v1.getPage(dataContext)(placeTypeQualifier, cursor, stringifiedLimit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((placeTypeQualifier))).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        isContactTypeQualifier.returns(true);
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Place.v1.getPage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(getPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isContactTypeQualifier.returns(false);

        await expect(Place.v1.getPage(dataContext)(invalidQualifier, cursor, limit))
          .to.be.rejectedWith(`Invalid contact type [${JSON.stringify(invalidQualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
        expect(getPage.notCalled).to.be.true;
      });

      [
        -1,
        null,
        {},
        '',
        0,
        1.1,
        false
      ].forEach((limitValue) => {
        it(`throws an error if limit is invalid: ${JSON.stringify(limitValue)}`, async () => {
          isContactTypeQualifier.returns(true);
          getPage.resolves(places);

          await expect(Place.v1.getPage(dataContext)(placeTypeQualifier, cursor, limitValue as number))
            .to.be.rejectedWith(`The limit must be a positive integer: [${JSON.stringify(limitValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage))
            .to.be.true;
          expect(isContactTypeQualifier.calledOnceWithExactly((placeTypeQualifier))).to.be.true;
          expect(getPage.notCalled).to.be.true;
        });
      });

      [
        {},
        '',
        1,
        false,
      ].forEach((invalidCursor) => {
        it('throws an error if cursor is invalid', async () => {
          isContactTypeQualifier.returns(true);
          getPage.resolves(places);

          await expect(Place.v1.getPage(dataContext)(placeTypeQualifier, invalidCursor as string, limit))
            .to.be.rejectedWith(
              `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}]`
            );

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Place.v1.getPage, Remote.Place.v1.getPage))
            .to.be.true;
          expect(isContactTypeQualifier.calledOnceWithExactly((placeTypeQualifier))).to.be.true;
          expect(getPage.notCalled).to.be.true;
        });
      });
    });

    describe('getAll', () => {
      const placeType = 'place';
      const placeTypeQualifier = { contactType: placeType } as const;
      const firstPlace = { _id: 'place1' } as Place.v1.Place;
      const secondPlace = { _id: 'place2' } as Place.v1.Place;
      const thirdPlace = { _id: 'place3' } as Place.v1.Place;
      const places = [ firstPlace, secondPlace, thirdPlace ];
      const mockGenerator = function* () {
        for (const place of places) {
          yield place;
        }
      };

      let placeGetPage: sinon.SinonStub;
      let getPagedGenerator: sinon.SinonStub;

      beforeEach(() => {
        placeGetPage = sinon.stub(Place.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(placeGetPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      it('should get place generator with correct parameters', () => {
        isContactTypeQualifier.returns(true);
        getPagedGenerator.returns(mockGenerator);

        const generator = Place.v1.getAll(dataContext)(placeTypeQualifier);

        expect(generator).to.deep.equal(mockGenerator);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(placeGetPage, placeTypeQualifier)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(placeTypeQualifier)).to.be.true;
      });

      it('should throw an error for invalid datacontext', () => {
        const errMsg = 'Invalid data context [null].';
        isContactTypeQualifier.returns(true);
        assertDataContext.throws(new Error(errMsg));

        expect(() => Place.v1.getAll(dataContext)).to.throw(errMsg);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(placeGetPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
      });

      it('should throw an error for invalid placeType', () => {
        isContactTypeQualifier.returns(false);

        expect(() => Place.v1.getAll(dataContext)(placeTypeQualifier))
          .to.throw(`Invalid contact type [${JSON.stringify(placeTypeQualifier)}].`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(placeGetPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(placeTypeQualifier)).to.be.true;
      });
    });

    describe('create', () => {
      it('returns place doc for valid input', async () => {
        const createPlaceDoc = sinon.stub();
        adapt.returns(createPlaceDoc);
        const input = {
          name: 'place-1',
          type: 'place',
        };
        isPlaceInput.returns(true);
        createPlaceDoc.resolves(input);
        const result = await Place.v1.create(dataContext)(input);

        expect(result).to.deep.equal(input);
      });
    });

    describe('update', () => {
      it('returns updated place doc for valid input', async () => {
        const updatePlaceDoc = sinon.stub();
        adapt.returns(updatePlaceDoc);
        const updateInput = {
          name: 'place-1',
          type: 'place'
        };
        const expectedDoc = {
          ...updateInput, reported_date: 12312312
        };
        updatePlaceDoc.resolves(expectedDoc);
        const result = await Place.v1.update(dataContext)(updateInput);

        expect(result).to.deep.equal(expectedDoc);
      });

      it('throws error for invalid input', async () => {
        const updatePlaceDoc = sinon.stub();
        adapt.returns(updatePlaceDoc);
        const updateInput = 'my-updated-place';
        await expect(Place.v1.update(dataContext)(updateInput))
          .to.be.rejectedWith('Invalid place update input');
      });
    });
  });
});
