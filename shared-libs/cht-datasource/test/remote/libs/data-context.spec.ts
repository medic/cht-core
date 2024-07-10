import { expect } from 'chai';
import logger from '@medic/logger';
import sinon, { SinonStub } from 'sinon';
import {
  assertRemoteDataContext,
  getResource,
  getRemoteDataContext,
  isRemoteDataContext,
  RemoteDataContext
} from '../../../src/remote/libs/data-context';
import { DataContext } from '../../../src';

describe('remote context lib', () => {
  const context = { url: 'hello.world' } as RemoteDataContext;
  let fetchResponse: { ok: boolean, status: number, statusText: string, json: SinonStub };
  let fetchStub: SinonStub;
  let loggerError: SinonStub;

  beforeEach(() => {
    fetchResponse = { 
      ok: true,
      status: 200,
      statusText: 'OK',
      json: sinon.stub().resolves()
    };
    fetchStub = sinon.stub(global, 'fetch').resolves(fetchResponse as unknown as Response);
    loggerError = sinon.stub(logger, 'error');
  });

  afterEach(() => sinon.restore());

  describe('isRemoteDataContext', () => {
    ([
      [{ url: 'hello.world' }, true],
      [{ hello: 'world' }, false],
      [{ }, false],
    ] as [DataContext, boolean][]).forEach(([context, expected]) => {
      it(`evaluates ${JSON.stringify(context)}`, () => {
        expect(isRemoteDataContext(context)).to.equal(expected);
      });
    });
  });

  describe('assertRemoteDataContext', () => {
    it('asserts a remote data context', () => {
      const context = getRemoteDataContext('hello.world');

      expect(() => assertRemoteDataContext(context)).to.not.throw();
    });

    ([
      { hello: 'world' },
      { },
    ] as DataContext[]).forEach(context => {
      it(`throws an error for ${JSON.stringify(context)}`, () => {
        expect(() => assertRemoteDataContext(context))
          .to.throw(`Invalid remote data context [${JSON.stringify(context)}].`);
      });
    });
  });

  describe('getRemoteDataContext', () => {

    [
      '',
      'hello.world',
      undefined
    ].forEach(url => {
      it(`returns a remote data context for URL: ${JSON.stringify(url)}`, () => {
        const context = getRemoteDataContext(url);

        expect(isRemoteDataContext(context)).to.be.true;
        expect(context).to.deep.include({ url: url ?? '' });
      });
    });


    [
      null,
      0,
      {},
      [],
    ].forEach(url => {
      it(`throws an error for an invalid URL: ${JSON.stringify(url)}`, () => {
        expect(() => getRemoteDataContext(url as string))
          .to.throw(`Invalid URL [${JSON.stringify(url)}].`);
      });
    });
  });

  describe('getResource', () => {
    it('fetches a resource with a path', async () => {
      const path = 'path';
      const resourceId = 'resource';
      const resource = { hello: 'world' };
      fetchResponse.json.resolves(resource);

      const response = await getResource(context, path)(resourceId);

      expect(response).to.equal(resource);
      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}/${resourceId}?`)).to.be.true;
      expect(fetchResponse.json.calledOnceWithExactly()).to.be.true;
    });

    it('returns null if the resource is not found', async () => {
      const path = 'path';
      const resourceId = 'resource';
      fetchResponse.ok = false;
      fetchResponse.status = 404;

      const response = await getResource(context, path)(resourceId);

      expect(response).to.be.null;
      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}/${resourceId}?`)).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
      expect(loggerError.notCalled).to.be.true;
    });

    it('throws an error if the resource fetch rejects', async () => {
      const path = 'path';
      const resourceId = 'resource';
      const expectedError = new Error('unexpected error');
      fetchStub.rejects(expectedError);

      await expect(getResource(context, path)(resourceId)).to.be.rejectedWith(expectedError);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}/${resourceId}?`)).to.be.true;
      expect(loggerError.calledOnceWithExactly(
        `Failed to fetch ${resourceId} from ${context.url}/${path}`,
        expectedError
      )).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
    });

    it('throws an error if the resource fetch resolves an error status', async () => {
      const path = 'path';
      const resourceId = 'resource';      fetchResponse.ok = false;
      fetchResponse.status = 501;
      fetchResponse.statusText = 'Not Implemented';

      await expect(getResource(context, path)(resourceId)).to.be.rejectedWith(fetchResponse.statusText);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}/${resourceId}?`)).to.be.true;
      expect(loggerError.calledOnce).to.be.true;
      expect(loggerError.args[0]).to.deep.equal([
        `Failed to fetch ${resourceId} from ${context.url}/${path}`,
        new Error(fetchResponse.statusText)
      ]);
      expect(fetchResponse.json.notCalled).to.be.true;
    });
  });
});
