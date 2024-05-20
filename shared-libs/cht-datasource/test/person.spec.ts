import * as Person from '../src/person';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as LocalContext from '../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DataContext } from '../src';
import { LocalDataContext } from '../src/local/libs/data-context';

describe('person', () => {
  const dataContext = { };
  let isUuidQualifier: SinonStub;
  let isLocalDataContext: SinonStub;

  beforeEach(() => {
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isLocalDataContext = sinon.stub(LocalContext, 'isLocalDataContext');
  });

  afterEach(() => sinon.restore());

  describe('V1', () => {
    describe('get', () => {
      const get = Person.V1.get(dataContext);
      const person = { _id: 'my-person' } as Person.V1.Person;
      const qualifier = { uuid: person._id };

      it('returns the person for the given qualifier from a remote data context', async () => {
        isUuidQualifier.returns(true);
        isLocalDataContext.returns(false);
        const remoteGet = sinon.stub(Remote.Person.V1, 'get').resolves(person);

        const result = await get(qualifier);

        expect(result).to.equal(person);
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isLocalDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(remoteGet.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('returns the person for the given qualifier from a local data context', async () => {
        isUuidQualifier.returns(true);
        isLocalDataContext.returns(true);
        const localGet = sinon.stub(Local.Person.V1, 'get').resolves(person);

        const result = await get(qualifier);

        expect(result).to.equal(person);
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isLocalDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(localGet.calledOnceWithExactly(dataContext as LocalDataContext, qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(get(qualifier)).to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isLocalDataContext.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        expect(() => Person.V1.get(null as unknown as DataContext)).to.throw(`Invalid data context [null].`);
      });
    });
  });
});
