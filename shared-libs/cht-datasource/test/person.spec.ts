import * as Person from '../src/person';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Context from '../src/libs/data-context';
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
      const cursor = '-1';
      const pageData = { data: people, cursor };
      const limit = 3;
      const skip = 1;
      const invalidLimit = -1;
      const invalidSkip = -1;
      const personTypeQualifier = {contactType: 'person'} as const;
      const invalidQualifier = { contactType: 'invalid' } as const;
      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub();
        adapt.returns(getPage);
      });

      it('retrieves people from the data context', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(pageData);

        const result = await Person.v1.getPage(dataContext)(personTypeQualifier, limit, skip);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(getPage.calledOnceWithExactly(personTypeQualifier, limit, skip)).to.be.true;
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

        await expect(Person.v1.getPage(dataContext)(invalidQualifier, limit, skip))
          .to.be.rejectedWith(`Invalid contact type [${JSON.stringify(invalidQualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
        expect(getPage.notCalled).to.be.true;
      });

      it('throws an error if limit is invalid', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(people);

        await expect(Person.v1.getPage(dataContext)(personTypeQualifier, invalidLimit, skip))
          .to.be.rejectedWith(`limit must be a positive number`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
        expect(getPage.notCalled).to.be.true;
      });

      it('throws an error if skip is invalid', async () => {
        isContactTypeQualifier.returns(true);
        getPage.resolves(people);

        await expect(Person.v1.getPage(dataContext)(personTypeQualifier, limit, invalidSkip))
          .to.be.rejectedWith(`skip must be a non-negative number`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Person.v1.getPage, Remote.Person.v1.getPage)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly((personTypeQualifier))).to.be.true;
        expect(getPage.notCalled).to.be.true;
      });
    });

    describe('getAll', () => {
      const personType = 'person';
      const personTypeQualifier = {contactType: personType} as const;
      const limit = 100;
      const skip0 = 0;
      const people = [{ _id: 'person1' }, { _id: 'person2' }, { _id: 'person3' }] as Person.v1.Person[];
      const person = { _id: 'person' } as Person.v1.Person;

      let personGetPage: sinon.SinonStub;

      beforeEach(() => {
        personGetPage = sinon.stub(Person.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(personGetPage);
      });

      it('should get people generator with correct parameters', async () => {
        isContactTypeQualifier.returns(true);
        personGetPage.returns(people);

        const generator =  Person.v1.getAll(dataContext)(personTypeQualifier);
        const res = await generator.next();
        await generator.next(); // the exit call

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.calledOnceWithExactly(personTypeQualifier, limit, skip0)).to.be.true;
        expect(res.value).to.deep.equal(people);
        expect(isContactTypeQualifier.calledOnceWithExactly(personTypeQualifier)).to.be.true;
      });

      it('should get people generator with multiple batches with correct parameters', async () => {
        isContactTypeQualifier.returns(true);
        const firstPage = Array.from({ length: 100 }, () => ({ ...person }));
        const secondPage = Array.from({ length: 99 }, () => ({ ...person }));
        personGetPage.onCall(0).returns(firstPage);
        personGetPage.onCall(1).returns(secondPage);

        const generator =  Person.v1.getAll(dataContext)(personTypeQualifier);
        const page1 = await generator.next();
        const page2 = await generator.next();
        await generator.next(); // the exit call

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.callCount).to.equal(2);
        expect(page1.value).to.deep.equal(firstPage);
        expect(page2.value).to.deep.equal(secondPage);
        expect(isContactTypeQualifier.calledOnceWithExactly(personTypeQualifier)).to.be.true;
      });

      it('should handle empty result set', async () => {
        isContactTypeQualifier.returns(true);
        personGetPage.returns([]);

        const generator =  Person.v1.getAll(dataContext)(personTypeQualifier);
        const res = await generator.next();
        await generator.next(); // the exit call

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.calledOnceWithExactly(personTypeQualifier, limit, skip0)).to.be.true;
        expect(res.value).to.deep.equal([]);
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

      it('should throw an error for invalid personType', async () => {
        isContactTypeQualifier.returns(false);

        const generator =  Person.v1.getAll(dataContext)(personTypeQualifier);
        await expect(generator.next()).to.be.rejectedWith(`Invalid type [${JSON.stringify(personTypeQualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(personTypeQualifier)).to.be.true;
      });
    });
  });
});
