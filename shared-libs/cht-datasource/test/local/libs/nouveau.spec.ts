import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { Doc } from '../../../src/libs/doc';
import * as LocalDoc from '../../../src/local/libs/doc';
import * as Qualifier from '../../../src/qualifier';
import { queryByFreetext, useNouveauIndexes } from '../../../src/local/libs/nouveau';

describe('nouveau', () => {
  let dbFetch: SinonStub;
  let db: PouchDB.Database<Doc>;

  beforeEach(() => {
    dbFetch = sinon.stub();
    db = { fetch: dbFetch } as unknown as PouchDB.Database<Doc>;
  });

  afterEach(() => sinon.restore());

  describe('queryByFreetext', () => {
    const expectedOpts = {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      method: 'POST',
    } as const;
    const mockResponse = {
      ok: true,
      json: sinon.stub().resolves({
        hits: [{ id: 'doc1' }, { id: 'doc2' }],
        bookmark: 'bookmark1'
      })
    } as const;

    ([
      ['key:value', 'exact_match:"key:value"'],
      ['searchterm', 'searchterm*']
    ] as [string, string][]).forEach(([freetext, q]) => {
      it('should query for freetext qualifier', async () => {
        const qualifier = Qualifier.byFreetext(freetext);
        dbFetch.resolves(mockResponse);
        const body = {
          bookmark: null,
          limit: 10,
          q,
          sort: 'reported_date'
        };

        const result = await queryByFreetext(db, 'reports_by_freetext')(qualifier, body.bookmark, body.limit);

        expect(result).to.deep.equal({ data: ['doc1', 'doc2'], cursor: null });
        expect(dbFetch.calledOnceWithExactly(
          '_design/online-user/_nouveau/reports_by_freetext',
          { ...expectedOpts, body: JSON.stringify(body) }
        )).to.be.true;
      });
    });

    ([
      ['key:value', 'contact_type:"person" AND exact_match:"key:value"'],
      ['searchterm', 'contact_type:"person" AND searchterm*']
    ] as [string, string][]).forEach(([freetext, q]) => {
      it('should query with contact type and freetext qualifier', async () => {
        const qualifier = Qualifier.and(
          Qualifier.byFreetext(freetext),
          Qualifier.byContactType('person')
        );
        dbFetch.resolves(mockResponse);
        const body = {
          bookmark: 'bookmark',
          limit: 10,
          q,
          sort: 'sort_order'
        };

        const result = await queryByFreetext(db, 'contacts_by_freetext')(qualifier, body.bookmark, body.limit);

        expect(result).to.deep.equal({ data: ['doc1', 'doc2'], cursor: null });
        expect(dbFetch.calledOnceWithExactly(
          '_design/online-user/_nouveau/contacts_by_freetext',
          { ...expectedOpts, body: JSON.stringify(body) }
        )).to.be.true;
      });
    });


    it('should return next cursor when data fills limit and bookmark changes', async () => {
      const qualifier = Qualifier.byFreetext('searchterm');
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          hits: [{ id: 'doc1' }, { id: 'doc2' }, { id: 'doc3' }],
          bookmark: 'new-bookmark'
        })
      };
      dbFetch.resolves(mockResponse);
      const body = {
        bookmark: null,
        limit: 3,
        q: 'searchterm*',
        sort: 'sort_order'
      };

      const result = await queryByFreetext(db, 'contacts_by_freetext')(qualifier, null, 3);

      expect(result).to.deep.equal({ data: ['doc1', 'doc2', 'doc3'], cursor: 'new-bookmark' });
      expect(dbFetch.calledOnceWithExactly(
        '_design/online-user/_nouveau/contacts_by_freetext',
        { ...expectedOpts, body: JSON.stringify(body) }
      )).to.be.true;
    });

    it('should return null cursor when bookmark is unchanged', async () => {
      const qualifier = Qualifier.byFreetext('searchterm');
      dbFetch.resolves(mockResponse);
      const body = {
        bookmark: 'bookmark1',
        limit: 3,
        q: 'searchterm*',
        sort: 'sort_order'
      };

      const result = await queryByFreetext(db, 'contacts_by_freetext')(qualifier, 'bookmark1', 3);

      expect(result).to.deep.equal({ data: ['doc1', 'doc2'], cursor: null });
      expect(dbFetch.calledOnceWithExactly(
        '_design/online-user/_nouveau/contacts_by_freetext',
        { ...expectedOpts, body: JSON.stringify(body) }
      )).to.be.true;
    });

    it('should throw error when response is not ok', async () => {
      const qualifier = Qualifier.byFreetext('searchterm');
      const mockResponse = {
        ok: false,
        statusText: 'Internal Server Error'
      };
      dbFetch.resolves(mockResponse);
      const body = {
        bookmark: null,
        limit: 10,
        q: 'searchterm*',
        sort: 'sort_order'
      };

      await expect(
        queryByFreetext(db, 'contacts_by_freetext')(qualifier, null, 10)
      ).to.be.rejectedWith('Internal Server Error');

      expect(dbFetch.calledOnceWithExactly(
        '_design/online-user/_nouveau/contacts_by_freetext',
        { ...expectedOpts, body: JSON.stringify(body) }
      )).to.be.true;
    });

    [
      { hits: [], bookmark: 'bookmark' },
      { hits: [], },
      { bookmark: 'bookmark' },
      { },
    ].forEach((responseJson) => {
      it('should return empty data when no hits', async () => {
        const qualifier = Qualifier.byFreetext('searchterm');
        const mockResponse = {
          ok: true,
          json: sinon.stub().resolves(responseJson)
        };
        dbFetch.resolves(mockResponse);
        const body = {
          bookmark: null,
          limit: 10,
          q: 'searchterm*',
          sort: 'sort_order'
        };

        const result = await queryByFreetext(db, 'contacts_by_freetext')(qualifier, null, 10);

        expect(result).to.deep.equal({ data: [], cursor: null });
        expect(dbFetch.calledOnceWithExactly(
          '_design/online-user/_nouveau/contacts_by_freetext',
          { ...expectedOpts, body: JSON.stringify(body) }
        )).to.be.true;
      });
    });
  });

  describe('useNouveauIndexes', () => {
    let getDocByIdOuter: SinonStub;
    let getDocByIdInner: SinonStub;

    beforeEach(() => {
      getDocByIdInner = sinon.stub();
      getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
    });

    it('should return true when offline freetext ddoc does not exist', async () => {
      getDocByIdInner.resolves(null);

      const result = await useNouveauIndexes(db);

      expect(result).to.be.true;
      expect(getDocByIdOuter.calledOnceWithExactly(db)).to.be.true;
      expect(getDocByIdInner.calledOnceWithExactly('_design/medic-offline-freetext')).to.be.true;
    });

    it('should return false when offline freetext ddoc exists', async () => {
      getDocByIdInner.resolves({ _id: '_design/medic-offline-freetext', _rev: '1-abc' });

      const result = await useNouveauIndexes(db);

      expect(result).to.be.false;
      expect(getDocByIdOuter.calledOnceWithExactly(db)).to.be.true;
      expect(getDocByIdInner.calledOnceWithExactly('_design/medic-offline-freetext')).to.be.true;
    });
  });
});
