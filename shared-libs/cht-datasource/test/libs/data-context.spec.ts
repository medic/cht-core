import { expect } from 'chai';
import { adapt, assertDataContext, getDocumentStream } from '../../src/libs/data-context';
import * as LocalContext from '../../src/local/libs/data-context';
import * as RemoteContext from '../../src/remote/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { DataContext } from '../../dist';


describe('context lib', () => {
  const context = { bind: sinon.stub() } as DataContext;
  let isLocalDataContext: SinonStub;
  let isRemoteDataContext: SinonStub;
  let assertRemoteDataContext: SinonStub;

  beforeEach(() => {
    isLocalDataContext = sinon.stub(LocalContext, 'isLocalDataContext');
    isRemoteDataContext = sinon.stub(RemoteContext, 'isRemoteDataContext');
    assertRemoteDataContext = sinon.stub(RemoteContext, 'assertRemoteDataContext');
  });

  afterEach(() => sinon.restore());

  describe('assertDataContext', () => {

    it('allows a remote data context', () => {
      isRemoteDataContext.returns(true);
      isLocalDataContext.returns(false);

      expect(() => assertDataContext(context)).to.not.throw();

      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(isRemoteDataContext.calledOnceWithExactly(context)).to.be.true;
    });

    it('allows a local data context', () => {
      isRemoteDataContext.returns(false);
      isLocalDataContext.returns(true);

      expect(() => assertDataContext(context)).to.not.throw();

      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(isRemoteDataContext.notCalled).to.be.true;
    });

    it(`throws an error if the data context is not remote or local`, () => {
      isRemoteDataContext.returns(false);
      isLocalDataContext.returns(false);

      expect(() => assertDataContext(context))
        .to
        .throw(`Invalid data context [${JSON.stringify(context)}].`);

      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(isRemoteDataContext.calledOnceWithExactly(context)).to.be.true;
    });

    [
      null,
      1,
      'hello',
      {}
    ].forEach((context) => {
      it(`throws an error if the data context is invalid [${JSON.stringify(context)}]`, () => {
        expect(() => assertDataContext(context)).to.throw(`Invalid data context [${JSON.stringify(context)}].`);

        expect(isLocalDataContext.notCalled).to.be.true;
        expect(isRemoteDataContext.notCalled).to.be.true;
      });
    });
  });

  describe('adapt', () => {
    const resource = { hello: 'world' } as const;
    let local: SinonStub;
    let remote: SinonStub;

    beforeEach(() => {
      local = sinon.stub();
      remote = sinon.stub();
    });

    it('adapts a local data context', () => {
      isLocalDataContext.returns(true);
      local.returns(resource);

      const result = adapt<typeof resource>(context, local, remote);

      expect(result).to.equal(resource);
      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(local.calledOnceWithExactly(context)).to.be.true;
      expect(assertRemoteDataContext.notCalled).to.be.true;
      expect(remote.notCalled).to.be.true;
    });

    it('adapts a remote data context', () => {
      isLocalDataContext.returns(false);
      remote.returns(resource);

      const result = adapt<typeof resource>(context, local, remote);

      expect(result).to.equal(resource);
      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(assertRemoteDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(local.notCalled).to.be.true;
      expect(remote.calledOnceWithExactly(context)).to.be.true;
    });

    it('throws an error if the data context is not remote or local', () => {
      isLocalDataContext.returns(false);
      const error = new Error('Invalid data context');
      assertRemoteDataContext.throws(error);

      expect(() => adapt<typeof resource>(context, local, remote)).to.throw(error);

      expect(isLocalDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(local.notCalled).to.be.true;
      expect(assertRemoteDataContext.calledOnceWithExactly(context)).to.be.true;
      expect(remote.notCalled).to.be.true;
    });
  });

  describe('getDocumentStream', () => {
    let fetchFunctionStub: SinonStub;
    const limit = 100;
    const skip = 0;

    beforeEach(() => {
      fetchFunctionStub = sinon.stub();
    });

    it('yields document one by one', async () => {
      const mockDocs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const extraArg = 'value';
      fetchFunctionStub.resolves(mockDocs);

      const generator = getDocumentStream(fetchFunctionStub, extraArg);

      const results = [];

      for await (const doc of generator) {
        results.push(doc);
      }

      expect(results).to.deep.equal(mockDocs);
      expect(fetchFunctionStub.calledOnceWithExactly(extraArg, limit, skip)).to.be.true;
    });

    it('should handle multiple pages',  async () => {
      const mockDoc = { id: 1 };
      const mockDocs1 = Array.from({ length: 100 }, () => ({ ...mockDoc }));
      const mockDocs2 = [{ id: 101 }];
      const extraArg = 'value';

      fetchFunctionStub.onFirstCall().resolves(mockDocs1);
      fetchFunctionStub.onSecondCall().resolves(mockDocs2);

      const generator = getDocumentStream(fetchFunctionStub, extraArg);

      const results = [];
      for await (const doc of generator) {
        results.push(doc);
      }

      expect(results).to.deep.equal([...mockDocs1, ...mockDocs2]);
      expect(fetchFunctionStub.callCount).to.equal(2);
      expect(fetchFunctionStub.firstCall.args).to.deep.equal([extraArg, limit, skip]);
      expect(fetchFunctionStub.secondCall.args).to.deep.equal([extraArg, limit, skip + limit]);
    });

    it('should handle empty result', async () => {
      fetchFunctionStub.resolves([]);

      const generator = getDocumentStream(fetchFunctionStub, { limit: 10, skip: 0 });

      const result = await generator.next();

      expect(result.done).to.be.true;
      expect(result.value).to.be.equal(undefined);
      expect(fetchFunctionStub.calledOnce).to.be.true;
    });
  });
});
