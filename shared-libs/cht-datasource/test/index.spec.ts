import { expect } from 'chai';
import * as Index from '../src';
import { hasAnyPermission, hasPermissions } from '../src/auth';
import * as Person from '../src/person';
import * as Qualifier from '../src/qualifier';
import sinon from 'sinon';
import * as Context from '../src/libs/data-context';

describe('CHT Script API - getDatasource', () => {
  const dataContext = { } as const;
  let assertDataContext: sinon.SinonStub;
  let datasource: ReturnType<typeof Index.getDatasource>;

  beforeEach(() => {
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
      'hasPermissions', 'hasAnyPermission', 'person'
    ]));

    it('permission', () => {
      expect(v1.hasPermissions).to.equal(hasPermissions);
      expect(v1.hasAnyPermission).to.equal(hasAnyPermission);
    });

    describe('person', () => {
      let person: typeof v1.person;

      beforeEach(() => person = v1.person);

      it('contains expected keys', () => {
        expect(person).to.have.all.keys(['getByUuid']);
      });

      it('getByUuid', async () => {
        const expectedPerson = {};
        const personGetInner = sinon.stub().resolves(expectedPerson);
        const personGetOuter = sinon.stub(Person.v1, 'get').returns(personGetInner);
        const qualifier = { uuid: 'my-persons-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPerson = await person.getByUuid(qualifier.uuid);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(personGetOuter.calledOnceWithExactly(dataContext)).to.be.true;
        expect(personGetInner.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });
    });
  });
});
