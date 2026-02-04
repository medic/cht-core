import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../../src/libs/doc';
import { getAuthenticatedFetch, getRequestBody } from '../../../src/local/libs/request-utils';
import { expect } from 'chai';
import { QueryParams } from '../../../src/local/libs/core';
import { SORT_BY_VIEW } from '../../../src/local/libs/constants';

describe('request-utils', () => {
  afterEach(() => sinon.restore());
  
  describe('getAuthenticatedFetch', () => {
    let dbFetchStub: SinonStub;
    let dbGet: SinonStub;
    let dbAllDocs: SinonStub;
    let dbQuery: SinonStub;
    let db: PouchDB.Database<Doc>;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    const options = { method: 'GET' };

    beforeEach(() => {
      dbFetchStub = sinon.stub();
      dbGet = sinon.stub();
      dbAllDocs = sinon.stub();
      dbQuery = sinon.stub();
      db = {
        get: dbGet,
        allDocs: dbAllDocs,
        query: dbQuery,
        fetch: dbFetchStub
      } as unknown as PouchDB.Database<Doc>;
    });

    it('should call db.fetch with the correct URL for a regular view', async () => {
      // Arrange
      const view = 'reports';
      const mockResponse = { ok: true };

      dbFetchStub.resolves(mockResponse);

      // Act
      const fetchFn = getAuthenticatedFetch(db, view);
      const result = await fetchFn(options);

      // Assert
      expect(
        dbFetchStub.calledOnceWithExactly('_design/online-user/_nouveau/reports', { headers: headers, ...options})
      ).to.be.true;
      expect(result).to.equal(mockResponse);
    });

    it('should call db.fetch with the correct URL for contacts_by_type_freetext view', async () => {
      // Arrange
      const view = 'contacts_by_type_freetext';
      const mockResponse = { ok: true };

      dbFetchStub.resolves(mockResponse);

      // Act
      const fetchFn = getAuthenticatedFetch(db, view);
      const result = await fetchFn({ method: 'GET' });

      // Assert
      expect(
        dbFetchStub.calledOnceWithExactly(
          '_design/online-user/_nouveau/contacts_by_freetext',
          { headers: headers, ...options}
        )
      ).to.be.true;
      expect(result).to.equal(mockResponse);
    });

    it('should merge provided options with headers', async () => {
      // Arrange
      const view = 'reports';
      const mockResponse = { ok: true };
      const options = {
        method: 'POST',
        body: JSON.stringify({ query: 'test' }),
        credentials: 'include' as const
      };

      dbFetchStub.resolves(mockResponse);

      // Act
      const fetchFn = getAuthenticatedFetch(db, view);
      await fetchFn(options);

      // Assert
      const passedOptions = dbFetchStub.firstCall.args[1] as RequestInit & { headers: Headers };
      expect(passedOptions.method).to.equal('POST');
      expect(passedOptions.body).to.equal(JSON.stringify({ query: 'test' }));
      expect(passedOptions.credentials).to.equal('include');
      expect(passedOptions.headers instanceof Headers).to.be.true;
    });

    it('should propagate errors from db.fetch', async () => {
      // Arrange
      const view = 'reports';
      const error = new Error('Network error');

      dbFetchStub.rejects(error);

      // Act & Assert
      const fetchFn = getAuthenticatedFetch(db, view);
      await expect(fetchFn({ method: 'GET' })).to.be.rejectedWith(error);
    });

    it('should return a function that can be called multiple times', async () => {
      // Arrange
      const view = 'reports';
      const mockResponse = { ok: true };

      dbFetchStub.resolves(mockResponse);

      // Act
      const fetchFn = getAuthenticatedFetch(db, view);
      await fetchFn({ method: 'GET' });
      await fetchFn({ method: 'POST' });

      // Assert
      expect(dbFetchStub.calledTwice).to.be.true;
      expect(dbFetchStub.firstCall.args[0]).to.equal('_design/online-user/_nouveau/reports');
      expect(dbFetchStub.secondCall.args[0]).to.equal('_design/online-user/_nouveau/reports');
    });
  });

  describe('getRequestBody', () => {
    interface RequestBody {
      bookmark?: string;
      limit?: number;
      q?: string;
      sort?: string;
    }

    it('should format request with exact match when key is provided', () => {
      // Arrange
      const view = 'medic/reports_by_freetext';
      const params: QueryParams = { key: 'test', limit: 50 };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed).to.deep.equal({
        limit: 50,
        q: 'exact_match:"test"',
        sort: SORT_BY_VIEW[view]
      });
    });

    it('should format request with prefix match when startKey is provided', () => {
      // Arrange
      const view = 'medic/reports_by_freetext';
      const params: QueryParams = { startKey: 'test', limit: 50 };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed).to.deep.equal({
        limit: 50,
        q: 'test*',
        sort: SORT_BY_VIEW[view]
      });
    });

    it('should use provided bookmark over params.cursor', () => {
      // Arrange
      const view = 'reports';
      const params: QueryParams = {
        key: 'test',
        limit: 50,
        cursor: 'params-bookmark'
      };
      const bookmark = 'specific-bookmark';

      // Act
      const result = getRequestBody(view, params, bookmark);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.bookmark).to.equal('specific-bookmark');
    });

    it('should use params.cursor when bookmark is null', () => {
      // Arrange
      const view = 'reports';
      const params: QueryParams = {
        key: 'test',
        limit: 50,
        cursor: 'params-bookmark'
      };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.bookmark).to.equal('params-bookmark');
    });

    it('should handle contacts_by_type_freetext view with key', () => {
      // Arrange
      const view = 'contacts_by_type_freetext';
      const params: QueryParams = {
        key: ['person', 'john'],
        limit: 50
      };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.q).to.equal('contact_type:"person" AND exact_match:"john"');
      expect(parsed.sort).to.deep.equal(SORT_BY_VIEW[view]);
    });

    it('should handle contacts_by_type_freetext view with startKey', () => {
      // Arrange
      const view = 'contacts_by_type_freetext';
      const params: QueryParams = {
        startKey: ['person', 'jo'],
        limit: 50
      };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.q).to.equal('contact_type:"person" AND jo*');
      expect(parsed.sort).to.deep.equal(SORT_BY_VIEW[view]);
    });

    it('should handle empty query when no key or startKey is provided', () => {
      // Arrange
      const view = 'reports';
      const params: QueryParams = { limit: 50 };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.q).to.equal('');
    });

    it('should properly escape special characters in startKey', () => {
      // Arrange
      const view = 'reports';
      const params: QueryParams = {
        startKey: 'query+with-special&chars[*?]',
        limit: 50
      };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      // All special chars should be escaped with backslash
      expect(parsed.q).to.equal('query\\+with\\-special\\&chars\\[\\*\\?\\]*');
    });

    it('should extract first item from array for regular views', () => {
      // Arrange
      const view = 'reports';
      const params: QueryParams = {
        key: ['first', 'second', 'third'],
        limit: 50
      };

      // Act
      const result = getRequestBody(view, params, null);
      const parsed = JSON.parse(result) as RequestBody;

      // Assert
      expect(parsed.q).to.equal('exact_match:"first"');
    });
  });
});
