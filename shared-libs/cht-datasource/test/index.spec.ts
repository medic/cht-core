import { expect } from 'chai';
import * as Index from '../src';
import { hasAnyPermission, hasPermissions } from '../src/auth';
import * as Person from '../src/person';
import * as Qualifier from '../src/qualifier';
import sinon from 'sinon';
import { DataContext } from '../src';

describe('CHT Script API - getDatasource', () => {
  const dataContext = { };
  const datasource = Index.getDatasource(dataContext);

  afterEach(() => sinon.restore());

  it('contains expected keys', () => {
    expect(datasource).to.have.all.keys([ 'v1' ]);
  });

  it('throws an error if the data context is invalid', () => {
    expect(() => Index.getDatasource(null as unknown as DataContext)).to.throw('Invalid data context [null].');
  });

  describe('v1', () => {
    const { v1 } = datasource;

    it('contains expected keys', () => expect(v1).to.have.all.keys([
      'hasPermissions', 'hasAnyPermission', 'person'
    ]));

    it('permission', () => {
      expect(v1.hasPermissions).to.equal(hasPermissions);
      expect(v1.hasAnyPermission).to.equal(hasAnyPermission);
    });

    describe('person', () => {
      const { person } = v1;

      it('contains expected keys', () => {
        expect(person).to.have.all.keys(['getByUuid']);
      });

      it('getByUuid', async () => {
        const expectedPerson = {};
        const personGetInner = sinon.stub().resolves(expectedPerson);
        const personGetOuter = sinon.stub(Person.V1, 'get').returns(personGetInner);
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
