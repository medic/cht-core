import { expect } from 'chai';
import logger from '@medic/logger';
import sinon, { SinonStub } from 'sinon';
import rpn from 'request-promise-native';
import {
  assertRemoteDataContext,
  get,
  getRemoteDataContext,
  isRemoteDataContext,
  RemoteDataContext
} from '../../../src/remote/libs/data-context';
import { DataContext } from '../../../src';

describe('remote context lib', () => {
  const context = { url: 'hello.world' } as RemoteDataContext;
  let rpnGet: SinonStub;
  let loggerError: SinonStub;

  beforeEach(() => {
    rpnGet = sinon.stub(rpn, 'get');
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
      const context = { url: 'hello.world' };

      expect(() => assertRemoteDataContext(context)).to.not.throw();
    });

    [
      { hello: 'world' },
      { },
    ].forEach(context => {
      it(`throws an error for ${JSON.stringify(context)}`, () => {
        expect(() => assertRemoteDataContext(context))
          .to.throw(`Invalid remote data context [${JSON.stringify(context)}].`);
      });
    });
  });

  describe('getRemoteDataContext', () => {
    it('returns a remote data context', () => {
      const url = 'hello.world';

      const context = getRemoteDataContext(url);

      expect(isRemoteDataContext(context)).to.be.true;
      expect(context).to.deep.equal({ url });
    });

    [
      '',
      null,
      0,
      {},
      [],
    ].forEach(url => {
      it(`throws an error for an invalid URL: ${JSON.stringify(url)}`, () => {
        expect(() => getRemoteDataContext(url as string))
          .to.throw(`Invalid UUID [${JSON.stringify(url)}].`);
      });
    });
  });

  describe('get', () => {
    it('fetches a resource with a path', async () => {
      const path = 'path/';
      const resourceName = 'resource';
      const resource = { hello: 'world' };
      rpnGet.resolves(resource);

      const response = await get(context, path)(resourceName);

      expect(response).to.equal(resource);
      expect(rpnGet.calledOnceWithExactly({ uri: `${context.url}/${path}${resourceName}`, json: true })).to.be.true;
    });

    it('fetches a resource without a path', async () => {
      const resourceName = 'path/resource';
      const resource = { hello: 'world' };
      rpnGet.resolves(resource);

      const response = await get(context)(resourceName);

      expect(response).to.equal(resource);
      expect(rpnGet.calledOnceWithExactly({ uri: `${context.url}/${resourceName}`, json: true })).to.be.true;
    });

    it('returns null if the resource is not found', async () => {
      const resourceName = 'path/resource';
      rpnGet.rejects({ statusCode: 404 });

      const response = await get(context)(resourceName);

      expect(response).to.be.null;
      expect(rpnGet.calledOnceWithExactly({ uri: `${context.url}/${resourceName}`, json: true })).to.be.true;
    });

    it('throws an error if the resource fetch fails', async () => {
      const resourceName = 'path/resource';
      const expectedError = new Error('unexpected error');
      rpnGet.rejects(expectedError);

      await expect(get(context)(resourceName)).to.be.rejectedWith(expectedError.message);

      expect(rpnGet.calledOnceWithExactly({ uri: `${context.url}/${resourceName}`, json: true })).to.be.true;
      expect(loggerError.calledOnceWithExactly(`Failed to fetch ${resourceName} from ${context.url}`, expectedError))
        .to.be.true;
    });
  });
});
