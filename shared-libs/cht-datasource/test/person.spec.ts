import * as Person from '../src/person';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Context from '../src/libs/data-context';
import * as Core from '../src/libs/core';
import * as Input from '../src/input';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext } from '../src';
import { fakeGenerator } from './utils';
import { Page } from '../src';

describe('person', () => {
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
      const person = { _id: 'my-person' } as Person.v1.Person;
      const qualifier = { uuid: person._id } as const;
      let getPerson: SinonStub;

      beforeEach(() => {
        getPerson = sinon.stub();
        adapt.returns(getPerson);
      });

      it('retrieves the person for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getPerson.resolves(person);

        const result = await Person.v1.get(dataContext)(qualifier);

        expect(result).to.equal(person);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.get, Remote.Person.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPerson.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Person.v1.get(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.get, Remote.Person.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPerson.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Person.v1.get(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getPerson.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const person = { _id: 'my-person' } as Person.v1.Person;
      const qualifier = { uuid: person._id } as const;
      let getPersonWithLineage: SinonStub;

      beforeEach(() => {
        getPersonWithLineage = sinon.stub();
        adapt.returns(getPersonWithLineage);
      });

      it('retrieves the person with lineage for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getPersonWithLineage.resolves(person);

        const result = await Person.v1.getWithLineage(dataContext)(qualifier);

        expect(result).to.equal(person);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Person.v1.getWithLineage,
          Remote.Person.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPersonWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Person.v1.getWithLineage(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Person.v1.getWithLineage,
          Remote.Person.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getPersonWithLineage.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Person.v1.getWithLineage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getPersonWithLineage.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const people = [ { _id: 'person1' }, { _id: 'person2' }, { _id: 'person3' } ] as Person.v1.Person[];
      const cursor = '1';
      const pageData = { data: people, cursor };
      const limit = 3;
      const stringifiedLimit = '3';
      const personTypeQualifier = { contactType: 'person' } as const;
      const invalidQualifier = { contactType: 'invalid' } as const;
      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub();
        adapt.returns(getPage);
      });

      it('retrieves people from the data context when cursor is null', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Person.v1.getPage(dataContext)(personTypeQualifier, null, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(personTypeQualifier, null, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
      });

      it('uses default cursor and limit when not provided', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Person.v1.getPage(dataContext)(personTypeQualifier);

        expect(result).to.equal(pageData);
        expect(getPage.calledOnceWithExactly(personTypeQualifier, null, 100)).to.be.true;
      });

      it('retrieves people from the data context when cursor is not null', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Person.v1.getPage(dataContext)(personTypeQualifier, cursor, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
      });

      it('retrieves people from the data context when cursor is not null and ' +
        'limit is stringified number', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Person.v1.getPage(dataContext)(personTypeQualifier, cursor, stringifiedLimit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        isContactTypeQualifier.returns(true);
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Person.v1.getPage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(getPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isContactTypeQualifier.returns(false);

        await expect(Person.v1.getPage(dataContext)(invalidQualifier, cursor, limit))
          .to.be.rejectedWith(`Invalid contact type [${JSON.stringify(invalidQualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
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
          getPage.resolves(pageData);

          await expect(Person.v1.getPage(dataContext)(personTypeQualifier, cursor, limitValue as number))
            .to.be.rejectedWith(`The limit must be a positive integer: [${JSON.stringify(limitValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage))
            .to.be.true;
          expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
          expect(getPage.notCalled).to.be.true;
        });
      });

      [
        {},
        '',
        1,
        false,
      ].forEach((skipValue) => {
        it('throws an error if cursor is invalid', async () => {
          isContactTypeQualifier.returns(true);
          getPage.resolves(pageData);

          await expect(Person.v1.getPage(dataContext)(personTypeQualifier, skipValue as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(skipValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage))
            .to.be.true;
          expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
          expect(getPage.notCalled).to.be.true;
        });
      });
    });

    describe('getAll', () => {
      const personType = 'person';
      const personTypeQualifier = { contactType: personType } as const;
      const firstPerson = { _id: 'person1' } as Person.v1.Person;
      const secondPerson = { _id: 'person2' } as Person.v1.Person;
      const thirdPerson = { _id: 'person3' } as Person.v1.Person;
      const people = [firstPerson, secondPerson, thirdPerson];
      const mockGenerator = fakeGenerator(people);

      let personGetPage: sinon.SinonStub;
      let getPagedGenerator: sinon.SinonStub;

      beforeEach(() => {
        personGetPage = sinon.stub(Person.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(personGetPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      it('should get people generator with correct parameters', () => {
        isContactTypeQualifier.returns(true);
        getPagedGenerator.returns(mockGenerator);

        const generator = Person.v1.getAll(dataContext)(personTypeQualifier);

        expect(generator).to.deep.equal(mockGenerator);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(personGetPage, personTypeQualifier)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(personTypeQualifier)).to.be.true;
      });

      it('should throw an error for invalid datacontext', () => {
        const errMsg = 'Invalid data context [null].';
        isContactTypeQualifier.returns(true);
        assertDataContext.throws(new Error(errMsg));

        expect(() => Person.v1.getAll(dataContext)).to.throw(errMsg);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
      });

      it('should throw an error for invalid personType', () => {
        isContactTypeQualifier.returns(false);

        expect(() => Person.v1.getAll(dataContext)(personTypeQualifier))
          .to.throw(`Invalid contact type [${JSON.stringify(personTypeQualifier)}]`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(personTypeQualifier)).to.be.true;
      });
    });

    describe('create', () => {
      let createPersonDoc: SinonStub;

      beforeEach(() => {
        createPersonDoc = sinon.stub();
        adapt.returns(createPersonDoc);
      });


      it('returns person doc for valid input', async () => {
        const input = {
          name: 'person-1',
          type: 'person',
          parent: 'p1'
        };
        const doc = {
          ...input,
          _id: 'new-doc'
        };
        createPersonDoc.resolves(doc);

        const result = await Person.v1.create(dataContext)(input);

        expect(result).to.equal(doc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.create, Remote.Person.v1.create))
          .to.be.true;
        expect(createPersonDoc.calledOnceWithExactly(input)).to.be.true;
      });

      it('Throws error is input is not a record', async () => {
        const input = 'hello' as unknown as Input.v1.PersonInput;
        await expect(Person.v1.create(dataContext)(input))
          .to.be.rejectedWith(`Person data not provided.`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.create, Remote.Person.v1.create))
          .to.be.true;
        expect(createPersonDoc.notCalled).to.be.true;
      });
    });

    describe('update', () => {
      let updatePersonDoc: SinonStub;

      beforeEach(() => {
        updatePersonDoc = sinon.stub();
        adapt.returns(updatePersonDoc);
      });

      it('returns person doc for valid input', async () => {
        const input = {
          name: 'person-1',
          type: 'person',
          parent: { _id: 'p1', name: 'hydrated parent doc' },
          _id: '123',
          _rev: '1-abc',
          reported_date: 12312312
        };
        const doc = {
          ...input,
          parent: { _id: input.parent._id }
        };
        updatePersonDoc.resolves(doc);

        const result = await Person.v1.update(dataContext)(input);

        expect(result).to.equal(doc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.update, Remote.Person.v1.update))
          .to.be.true;
        expect(updatePersonDoc.calledOnceWithExactly(input)).to.be.true;
      });

      it('throws error when input is not a record', async () => {
        const input = 'apoorva' as unknown as Input.v1.UpdatePersonInput;

        await expect(Person.v1.update(dataContext)(input))
          .to.be.rejectedWith(`Updated person data not provided.`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.update, Remote.Person.v1.update))
          .to.be.true;
        expect(updatePersonDoc.notCalled).to.be.true;
      });
    });

    describe('getDatasource', () => {
      let person: Person.v1.Datasource;

      beforeEach(() => person = Person.v1.getDatasource(dataContext));

      it('contains expected keys', () => {
        expect(person).to.have.all.keys([
          'getByType',
          'getByUuid',
          'getByUuidWithLineage',
          'getPageByType',
          'create',
          'update'
        ]);
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

      it('create', async () => {
        const personInput = { name: 'apoorva', type: 'person', parent: 'p1' };
        const expectedPerson = {
          ...personInput,
          reported_date: 12312312
        };
        const personCreate = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personCreate);

        const returnedPerson = await person.create(personInput);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.create)).to.be.true;
        expect(personCreate.calledOnceWithExactly(personInput)).to.be.true;
      });

      it('update', async () => {
        const personInput = {
          name: 'apoorva',
          type: 'person',
          parent: { _id: 'p1' },
          _id: '123',
          _rev: '1-abc',
          reported_date: 12312312
        };
        const expectedPerson = {
          ...personInput,
          _rev: '2-def',
        };
        const personUpdate = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personUpdate);

        const returnedPlace = await person.update(personInput);

        expect(returnedPlace).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.update)).to.be.true;
        expect(personUpdate.calledOnceWithExactly(personInput)).to.be.true;
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
        const expectedPeople: Page<Person.v1.Person> = { data: [], cursor: null };
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

      it('getPageByType uses default cursor and limit', async () => {
        const expectedPeople: Page<Person.v1.Person> = {data: [], cursor: null};
        const personGetPage = sinon.stub().resolves(expectedPeople);
        dataContextBind.returns(personGetPage);
        const personType = 'person';
        const personTypeQualifier = { contactType: personType };
        sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const returnedPeople = await person.getPageByType(personType);

        expect(returnedPeople).to.equal(expectedPeople);
        expect(personGetPage.calledOnceWithExactly(personTypeQualifier, null, 100)).to.be.true;
      });

      it('getByType', () => {
        const mockAsyncGenerator = fakeGenerator();

        const personGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(personGetAll);
        const personType = 'person';
        const personTypeQualifier = { contactType: personType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const res = person.getByType(personType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getAll)).to.be.true;
        expect(personGetAll.calledOnceWithExactly(personTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(personType)).to.be.true;
      });
    });
  });
});
