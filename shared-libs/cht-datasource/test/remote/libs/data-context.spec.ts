import { expect } from 'chai';
import logger from '@medic/logger';
import sinon, { SinonStub } from 'sinon';
import {
  assertRemoteDataContext,
  getRemoteDataContext,
  getResource,
  getResources,
  isRemoteDataContext,
  postResource,
  putResource,
  RemoteDataContext
} from '../../../src/remote/libs/data-context';
import { DataContext, InvalidArgumentError, ResourceNotFoundError } from '../../../src';

describe('remote context lib', () => {
  const context = { url: 'hello.world' } as RemoteDataContext;
  let fetchResponse: { ok: boolean, status: number, statusText: string, json: SinonStub, text: SinonStub };
  let fetchStub: SinonStub;
  let loggerError: SinonStub;

  beforeEach(() => {
    fetchResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: sinon.stub().resolves(),
      text: sinon.stub().resolves(),
    };
    fetchStub = sinon.stub(global, 'fetch').resolves(fetchResponse as unknown as Response);
    loggerError = sinon.stub(logger, 'error');
  });

  afterEach(() => sinon.restore());

  describe('isRemoteDataContext', () => {
    ([
      [{ url: 'hello.world' }, true],
      [{ hello: 'world' }, false],
      [{}, false],
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
      {},
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

    it('throws InvalidArgumentError if the Bad Request - 400 status is returned', async () => {
      const path = 'path';
      const errorMsg = 'Bad Request';
      const resourceId = 'resource';
      fetchResponse.ok = false;
      fetchResponse.status = 400;
      fetchResponse.statusText = errorMsg;
      // in case of 400 error which is for when input like query params is invalid
      // messages like `Invalid limit` is stored in the text() method
      fetchResponse.text.resolves(errorMsg);
      const expectedError = new InvalidArgumentError(errorMsg);

      await expect(getResource(context, path)(resourceId)).to.be.rejectedWith(errorMsg);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}/${resourceId}?`)).to.be.true;
      expect(fetchResponse.text.called).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
      expect(loggerError.args[0]).to.deep.equal([
        `Failed to fetch ${resourceId} from ${context.url}/${path}`,
        expectedError
      ]);
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
      const resourceId = 'resource';
      fetchResponse.ok = false;
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

  describe('postResource', () => {
    const path = 'path';
    const body = {
      _id: '1',
      name: 'user-1',
      contact: {
        _id: '1',
        parent: {
          _id: '2'
        }
      }
    } as const;

    ([
      [400, InvalidArgumentError],
      [404, ResourceNotFoundError]
    ] as [number, typeof Error][]).forEach(([status, Err]) => {
      it(`throws error if ${status} status is returned`, async () => {
        const errorMsg = 'Big Problem.';
        fetchResponse.ok = false;
        fetchResponse.status = status;
        fetchResponse.text.resolves(errorMsg);

        await expect(postResource(path)(context)(body)).to.be.rejectedWith(Err, errorMsg);

        expect(fetchStub.calledOnceWithExactly(
          `${context.url}/${path}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(body)
          }
        )).to.be.true;
        expect(fetchResponse.text.calledOnceWithExactly()).to.be.true;
        expect(fetchResponse.json.notCalled).to.be.true;
        expect(loggerError.args).to.deep.equal([[
          `Failed to POST resource to ${context.url}/${path}.`,
          new Err(errorMsg)
        ]]);
      });
    });

    it('throws an error when the server responds with non-400 error status', async () => {
      fetchResponse.ok = false;
      fetchResponse.status = 500;
      fetchResponse.statusText = 'Internal Server Error';

      await expect(postResource(path)(context)(body)).to.be.rejectedWith(fetchResponse.statusText);

      expect(fetchStub.calledOnceWithExactly(
        `${context.url}/${path}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify(body)
        }
      )).to.be.true;

      expect(fetchResponse.text.notCalled).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
      expect(loggerError.calledOnce).to.be.true;
      expect(loggerError.args).to.deep.equal([[
        `Failed to POST resource to ${context.url}/${path}.`,
        new Error(fetchResponse.statusText)
      ]]);
    });

    it('creates a resource for valid req body and path', async () => {
      const expected_response = { ...body, _id: '1', _rev: '1', _reported_date: 123123123 };
      fetchResponse.ok = true;
      fetchResponse.status = 200;
      fetchResponse.json.resolves(expected_response);

      const response = await postResource(path)(context)(body);

      expect(response).to.equal(expected_response);
      expect(fetchStub.calledOnceWithExactly(
        `${context.url}/${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        }
      )).to.be.true;
      expect(fetchResponse.json.calledOnceWithExactly()).to.be.true;
      expect(fetchResponse.text.notCalled).to.be.true;
      expect(loggerError.notCalled).to.be.true;
    });
  });

  describe('putResource', () => {
    const path = 'path';
    const body = {
      _id: '1',
      name: 'user-1',
      contact: {
        _id: '1',
        parent: {
          _id: '2'
        }
      }
    } as const;

    ([
      [400, InvalidArgumentError],
      [404, ResourceNotFoundError]
    ] as [number, typeof Error][]).forEach(([status, Err]) => {
      it(`throws error if ${status} status is returned`, async () => {
        const errorMsg = 'Big Problem.';
        fetchResponse.ok = false;
        fetchResponse.status = status;
        fetchResponse.text.resolves(errorMsg);

        await expect(putResource(path)(context)(body)).to.be.rejectedWith(errorMsg);

        expect(fetchStub.calledOnceWithExactly(
          `${context.url}/${path}/${body._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(body)
          }
        )).to.be.true;
        expect(fetchResponse.text.calledOnceWithExactly()).to.be.true;
        expect(fetchResponse.json.notCalled).to.be.true;
        expect(loggerError.args).to.deep.equal([[
          `Failed to PUT resource to ${context.url}/${path}/${body._id}.`,
          new Err(errorMsg)
        ]]);
      });
    });

    it('throws an error when the server responds with non-400 error status', async () => {
      fetchResponse.ok = false;
      fetchResponse.status = 502;
      fetchResponse.statusText = 'Bad Gateway';

      await expect(putResource(path)(context)(body)).to.be.rejectedWith(fetchResponse.statusText);

      expect(fetchStub.calledOnceWithExactly(
        `${context.url}/${path}/${body._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify(body)
        }
      )).to.be.true;
      expect(fetchResponse.text.notCalled).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
      expect(loggerError.calledOnce).to.be.true;
      expect(loggerError.args).to.deep.equal([[
        `Failed to PUT resource to ${context.url}/${path}/${body._id}.`,
        new Error(fetchResponse.statusText)
      ]]);
    });

    it('updates a resource for valid req body and path', async () => {
      const expected_response = { ...body, _rev: '1', _reported_date: 123123123 };
      fetchResponse.ok = true;
      fetchResponse.status = 200;
      fetchResponse.json.resolves(expected_response);

      const response = await putResource(path)(context)(body);

      expect(response).to.equal(expected_response);
      expect(fetchStub.calledOnceWithExactly(
        `${context.url}/${path}/${body._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify(body)
        }
      )).to.be.true;
      expect(fetchResponse.json.calledOnceWithExactly()).to.be.true;
      expect(fetchResponse.text.notCalled).to.be.true;
      expect(loggerError.notCalled).to.be.true;
    });
  });

  describe('getResources', () => {
    const params = { abc: 'xyz' };
    const stringifiedParams = new URLSearchParams(params).toString();

    it('fetches a resource with a path', async () => {
      const path = 'path';
      const resource = { hello: 'world' };
      fetchResponse.json.resolves(resource);

      const response = await getResources(context, path)(params);

      expect(response).to.equal(resource);
      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}?${stringifiedParams}`)).to.be.true;
      expect(fetchResponse.json.calledOnceWithExactly()).to.be.true;
    });

    it('throws an error if the resource fetch rejects', async () => {
      const path = 'path';
      const expectedError = new Error('unexpected error');
      fetchStub.rejects(expectedError);

      await expect(getResources(context, path)(params)).to.be.rejectedWith(expectedError);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}?${stringifiedParams}`)).to.be.true;
      expect(loggerError.calledOnceWithExactly(
        `Failed to fetch resources from ${context.url}/${path} with params: ${stringifiedParams}`,
        expectedError
      )).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
    });

    it('throws InvalidArgumentError if the Bad Request - 400 status is returned', async () => {
      const path = 'path';
      const errorMsg = 'Bad Request';
      fetchResponse.ok = false;
      fetchResponse.status = 400;
      fetchResponse.statusText = errorMsg;
      // in case of 400 error which is for when input like query params is invalid
      // messages like `Invalid limit` is stored in the text() method
      fetchResponse.text.resolves(errorMsg);
      const expectedError = new InvalidArgumentError(errorMsg);

      await expect(getResources(context, path)(params)).to.be.rejectedWith(errorMsg);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}?${stringifiedParams}`)).to.be.true;
      expect(fetchResponse.text.called).to.be.true;
      expect(fetchResponse.json.notCalled).to.be.true;
      expect(loggerError.args[0]).to.deep.equal([
        `Failed to fetch resources from ${context.url}/${path} with params: ${stringifiedParams}`,
        expectedError
      ]);
    });

    it('throws an error if the resource fetch resolves an error status', async () => {
      const path = 'path';
      fetchResponse.ok = false;
      fetchResponse.status = 501;
      fetchResponse.statusText = 'Not Implemented';

      await expect(getResources(context, path)(params)).to.be.rejectedWith(fetchResponse.statusText);

      expect(fetchStub.calledOnceWithExactly(`${context.url}/${path}?${stringifiedParams}`)).to.be.true;
      expect(loggerError.calledOnce).to.be.true;
      expect(loggerError.args[0]).to.deep.equal([
        `Failed to fetch resources from ${context.url}/${path} with params: ${stringifiedParams}`,
        new Error(fetchResponse.statusText)
      ]);
      expect(fetchResponse.json.notCalled).to.be.true;
    });
  });
});
