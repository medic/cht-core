import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote person', () => {
  const remoteContext = {} as RemoteDataContext;
  const sandbox = sinon.createSandbox();
  const postResourceOuter = sandbox.stub();
  const putResourceOuter = sandbox.stub();

  let Person: typeof import('../../src/remote/person');
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;
  let postResourceInner: SinonStub;
  let putResourceInner: SinonStub;

  before(() => {
    sinon
      .stub(RemoteEnv, 'postResource')
      .withArgs('api/v1/person')
      .returns(postResourceOuter);
    sinon
      .stub(RemoteEnv, 'putResource')
      .withArgs('api/v1/person')
      .returns(putResourceOuter);

    Reflect.deleteProperty(require.cache, require.resolve('../../src/remote/person'));
    Person = require('../../src/remote/person');
  });

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
    postResourceInner = sinon.stub();
    postResourceOuter.returns(postResourceInner);
    putResourceInner = sinon.stub();
    putResourceOuter.returns(putResourceInner);
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    const identifier = { uuid: 'uuid' } as const;

    describe('get', () => {
      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      it('returns a person with lineage by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Person.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Person.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = '1';
      const personType = 'person';
      const personTypeQualifier = { contactType: personType };
      const queryParam = {
        limit: limit.toString(),
        type: personType,
        cursor,
      };

      it('returns people', async () => {
        const doc = [{ type: 'person' }, { type: 'person' }];
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        const result = await Person.v1.getPage(remoteContext)(personTypeQualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await Person.v1.getPage(remoteContext)(personTypeQualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('omits cursor param when cursor is null', async () => {
        const expectedResponse = { data: [], cursor: null };
        getResourcesInner.resolves(expectedResponse);

        const result = await Person.v1.getPage(remoteContext)(personTypeQualifier, null, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesInner.calledOnceWithExactly({
          limit: limit.toString(),
          type: personType,
        })).to.be.true;
      });
    });

    describe('createPerson', () => {
      it('creates a person for a valid input', async () => {
        const personInput = {
          type: 'person',
          name: 'user-1',
          parent: 'p1'
        };
        const expectedDoc = { ...personInput, _id: '2', _rev: '1' };
        postResourceInner.resolves(expectedDoc);

        const result = await Person.v1.create(remoteContext)(personInput);

        expect(result).to.deep.equal(expectedDoc);
        expect(postResourceOuter.calledOnceWithExactly(remoteContext)).to.be.true;
        expect(postResourceInner.calledOnceWithExactly(personInput)).to.be.true;
      });
    });

    describe('updatePerson', () => {
      it('updates a person for a valid input', async () => {
        const personInput = {
          type: 'person',
          name: 'user-1',
          parent: 'p1',
          _id: '1-id',
          rev: '1-rev'
        };
        const expectedDoc = { ...personInput, _rev: '2' };
        putResourceInner.resolves(expectedDoc);

        const result = await Person.v1.update(remoteContext)(personInput);

        expect(result).to.deep.equal(expectedDoc);
        expect(putResourceOuter.calledOnceWithExactly(remoteContext)).to.be.true;
        expect(putResourceInner.calledOnceWithExactly(personInput)).to.be.true;
      });
    });
  });
});
