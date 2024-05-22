import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Person from '../../src/remote/person';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote person', () => {
  const remoteContext = {} as RemoteDataContext;
  let remoteInnerGet: SinonStub;
  let remoteOuterGet: SinonStub;

  beforeEach(() => {
    remoteInnerGet = sinon.stub();
    remoteOuterGet = sinon.stub(RemoteEnv, 'get').returns(remoteInnerGet);
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;

      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        remoteInnerGet.resolves(doc);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(remoteOuterGet.calledOnceWithExactly(remoteContext, 'api/v1/person/')).to.be.true;
        expect(remoteInnerGet.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        remoteInnerGet.resolves(null);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(remoteOuterGet.calledOnceWithExactly(remoteContext, 'api/v1/person/')).to.be.true;
        expect(remoteInnerGet.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });
  });
});
