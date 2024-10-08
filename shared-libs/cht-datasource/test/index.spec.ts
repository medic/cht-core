import { expect } from 'chai';
import * as Index from '../src';
import { hasAnyPermission, hasPermissions } from '../src/auth';
import * as Person from '../src/person';
import * as Place from '../src/place';
import * as Qualifier from '../src/qualifier';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import { DataContext } from '../src';
import { Page } from '../src/libs/core';

describe('CHT Script API - getDatasource', () => {
  let dataContext: DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let datasource: ReturnType<typeof Index.getDatasource>;

  beforeEach(() => {
    dataContextBind = sinon.stub();
    dataContext = { bind: dataContextBind };
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    datasource = Index.getDatasource(dataContext);
  });

  afterEach(() => sinon.restore());

  it('contains expected keys', () => {
    expect(datasource).to.have.all.keys([ 'v1' ]);
  });

  it('throws an error if the data context is invalid', () => {
    assertDataContext.throws(new Error(`Invalid data context [null].`));
    expect(() => Index.getDatasource(dataContext)).to.throw('Invalid data context [null].');
  });

  describe('v1', () => {
    let v1: typeof datasource.v1;

    beforeEach(() => v1 = datasource.v1);

    it('contains expected keys', () => expect(v1).to.have.all.keys([
      'hasPermissions', 'hasAnyPermission', 'person', 'place'
    ]));

    it('permission', () => {
      expect(v1.hasPermissions).to.equal(hasPermissions);
      expect(v1.hasAnyPermission).to.equal(hasAnyPermission);
    });

    describe('place', () => {
      let place: typeof v1.place;

      beforeEach(() => place = v1.place);

      it('contains expected keys', () => {
        expect(place).to.have.all.keys(['getByType', 'getByUuid', 'getByUuidWithLineage', 'getPageByType']);
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
        const expectedPlaces: Page<Place.v1.Place> = {data: [], cursor: null};
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

      it('getByType', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const placeGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(placeGetAll);
        const placeType = 'place';
        const placeTypeQualifier = { contactType: placeType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const res =  place.getByType(placeType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getAll)).to.be.true;
        expect(placeGetAll.calledOnceWithExactly(placeTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(placeType)).to.be.true;
      });
    });

    describe('person', () => {
      let person: typeof v1.person;

      beforeEach(() => person = v1.person);

      it('contains expected keys', () => {
        expect(person).to.have.all.keys(['getByType', 'getByUuid', 'getByUuidWithLineage', 'getPageByType']);
      });

      it('getByUuid', async () => {
        const expectedPerson = {};
        const personGet = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personGet);
        const qualifier = { uuid: 'my-persons-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPerson = await person.getByUuid(qualifier.uuid);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedPerson = {};
        const personGet = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personGet);
        const qualifier = { uuid: 'my-persons-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPerson = await person.getByUuidWithLineage(qualifier.uuid);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getPageByType', async () => {
        const expectedPeople: Page<Person.v1.Person> = {data: [], cursor: null};
        const personGetPage = sinon.stub().resolves(expectedPeople);
        dataContextBind.returns(personGetPage);
        const personType = 'person';
        const limit = 2;
        const cursor = '1';
        const personTypeQualifier = { contactType: personType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const returnedPeople = await person.getPageByType(personType, cursor, limit);

        expect(returnedPeople).to.equal(expectedPeople);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPage.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(byContactType.calledOnceWithExactly(personType)).to.be.true;
      });

      it('getByType', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const personGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(personGetAll);
        const personType = 'person';
        const personTypeQualifier = { contactType: personType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const res =  person.getByType(personType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getAll)).to.be.true;
        expect(personGetAll.calledOnceWithExactly(personTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(personType)).to.be.true;
      });
    });
  });
});
