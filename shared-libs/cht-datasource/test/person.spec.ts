import * as Person from '../src/person';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Context from '../src/libs/data-context';
import * as Core from '../src/libs/core';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext } from '../src';

describe('person', () => {
  const dataContext = { } as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isContactTypeQualifier: SinonStub;

  beforeEach(() => {
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
      const people = [{ _id: 'person1' }, { _id: 'person2' }, { _id: 'person3' }] as Person.v1.Person[];
      const cursor = '1';
      const pageData = { data: people, cursor };
      const limit = 3;
      const personTypeQualifier = {contactType: 'person'} as const;
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
        it(`throws an error if limit is invalid: ${String(limitValue)}`, async () => {
          isContactTypeQualifier.returns(true);
          getPage.resolves(people);

          await expect(Person.v1.getPage(dataContext)(personTypeQualifier, cursor, limitValue as number))
            .to.be.rejectedWith(`The limit must be a positive number: [${String(limitValue)}]`);

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
          getPage.resolves(people);

          await expect(Person.v1.getPage(dataContext)(personTypeQualifier, skipValue as string, limit))
            .to.be.rejectedWith(`Invalid cursor token: [${String(skipValue)}]`);

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
      const personTypeQualifier = {contactType: personType} as const;
      const firstPerson = { _id: 'person1' } as Person.v1.Person;
      const secondPerson = { _id: 'person2' } as Person.v1.Person;
      const thirdPerson = { _id: 'person3' } as Person.v1.Person;
      const people = [firstPerson, secondPerson, thirdPerson];
      const mockGenerator = function* () {
        for (const person of people) {
          yield person;
        }
      };
      const emptyMockGenerator = function* () {
        // empty
      };

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

        const generator =   Person.v1.getAll(dataContext)(personTypeQualifier);

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
  });
});
