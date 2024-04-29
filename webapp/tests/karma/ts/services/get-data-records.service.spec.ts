import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';

import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { DbService } from '@mm-services/db.service';
import { HydrateContactNamesService } from '@mm-services/hydrate-contact-names.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';

describe('GetDataRecords service', () => {
  let service:GetDataRecordsService;
  let allDocs;
  let getSummariesService;
  let hydrateContactNamesService;

  beforeEach(() => {
    allDocs = sinon.stub();
    hydrateContactNamesService = { get: sinon.stub() };
    getSummariesService = {
      get: sinon.stub(),
      getByDocs: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ allDocs }) } },
        { provide: HydrateContactNamesService, useValue: hydrateContactNamesService },
        { provide: GetSummariesService, useValue: getSummariesService },
      ]
    });

    service = TestBed.inject(GetDataRecordsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns empty array when given empty array', () => {
    return service.get([]).then(actual => expect(actual).to.deep.equal([]));
  });

  describe('getDocsSummaries()', () => {
    it('should catch when there are errors', () => {
      getSummariesService.getByDocs.throws('missing');

      return service
        .getDocsSummaries([ { _id: '5' } ])
        .then(() => assert.fail('Should have failed'))
        .catch(err => expect(err.name).to.equal('missing'));
    });

    it('should return empty array when no summaries', async () => {
      getSummariesService.getByDocs.returns(null);

      const actual = await service
        .getDocsSummaries([ { _id: '5' } ])
        .catch(() => assert.fail('Should have failed'));

      expect(actual).to.deep.equal([]);
      expect(getSummariesService.getByDocs.callCount).to.equal(1);
      expect(getSummariesService.getByDocs.args[0][0]).to.deep.equal([ { _id: '5' } ]);
      expect(allDocs.callCount).to.equal(0);
    });

    it('should return a single hydrated result', async () => {
      const expected = {
        _id: '5',
        name: 'five',
        contact: 'jim',
        lineage: [ 'area', 'center' ]
      };
      getSummariesService.getByDocs.returns([ {
        _id: '5',
        name: 'five',
        contact: 'a',
        lineage: [ 'b', 'c' ]
      } ]);
      hydrateContactNamesService.get.resolves([ expected ]);

      const actual = await service
        .getDocsSummaries([ { _id: '5' } ], { hydrateContactNames: true })
        .catch(() => assert.fail('Should have failed'));

      expect(actual).to.deep.equal([ expected ]);
      expect(getSummariesService.getByDocs.callCount).to.equal(1);
      expect(allDocs.callCount).to.equal(0);
    });

    it('should return multiple results', async () => {
      const expected = [
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ];
      getSummariesService.getByDocs.returns([
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ]);
      hydrateContactNamesService.get.resolves(expected);

      const actual = await service
        .getDocsSummaries([ { _id: '5' }, { _id: '6' }, { _id: '7' } ], { hydrateContactNames: true })
        .catch(() => assert.fail('Should have failed'));

      expect(actual).to.deep.equal(expected);
      expect(getSummariesService.getByDocs.callCount).to.equal(1);
      expect(getSummariesService.getByDocs.args[0][0]).to.deep.equal([ { _id: '5' }, { _id: '6' }, { _id: '7' } ]);
      expect(allDocs.callCount).to.equal(0);
    });
  });

  describe('get() - summaries', () => {
    it('db errors', () => {
      getSummariesService.get.rejects('missing');

      return service
        .get([ '5' ])
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => expect(err.name).to.equal('missing'));
    });

    it('no result', () => {
      getSummariesService.get.resolves(null);
      hydrateContactNamesService.get.resolves([]);

      return service
        .get([ '5' ])
        .then(actual => {
          expect(actual).to.deep.equal([]);
          expect(getSummariesService.get.callCount).to.equal(1);
          expect(getSummariesService.get.args[0][0]).to.deep.equal(['5']);
          expect(allDocs.callCount).to.equal(0);
        });
    });

    it('single hydrated result', () => {
      const expected = {
        _id: '5',
        name: 'five',
        contact: 'jim',
        lineage: [ 'area', 'center' ]
      };
      getSummariesService.get.resolves([
        {
          _id: '5',
          name: 'five',
          contact: 'a',
          lineage: [ 'b', 'c' ]
        }
      ]);
      hydrateContactNamesService.get.resolves([ expected ]);

      return service
        .get([ '5' ], { hydrateContactNames: true })
        .then(actual => {
          expect(actual).to.deep.equal([ expected ]);
          expect(getSummariesService.get.callCount).to.equal(1);
          expect(allDocs.callCount).to.equal(0);
          expect(hydrateContactNamesService.get.callCount).to.equal(1);
          expect(hydrateContactNamesService.get.args[0][0]).to.deep.equal([{
            _id: '5',
            name: 'five',
            contact: 'a',
            lineage: [ 'b', 'c' ]
          }]);
        });
    });

    it('multiple results', () => {
      const expected = [
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ];
      getSummariesService.get.resolves([
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ]);
      hydrateContactNamesService.get.resolves(expected);

      return service
        .get([ '5', '6', '7' ], { hydrateContactNames: true })
        .then(actual => {
          expect(actual).to.deep.equal(expected);
          expect(getSummariesService.get.callCount).to.equal(1);
          expect(getSummariesService.get.args[0][0]).to.deep.equal([ '5', '6', '7' ]);
          expect(allDocs.callCount).to.equal(0);
        });
    });
  });

  describe('get() - details', () => {
    it('db errors', () => {
      allDocs.rejects('missing');

      return service
        .get([ '5' ], { include_docs: true })
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => expect(err.name).to.equal('missing'));
    });

    it('no result', () => {
      allDocs.resolves({ rows: [] });

      return service
        .get([ '5' ], { include_docs: true })
        .then(actual => {
          expect(actual).to.deep.equal([]);
          expect(allDocs.callCount).to.equal(1);
          expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
          expect(getSummariesService.get.callCount).to.equal(0);
        });
    });

    it('single result', () => {
      allDocs.resolves({
        rows: [
          { doc: { _id: '5', name: 'five' } }
        ] });

      return service
        .get([ '5' ], { include_docs: true })
        .then(actual => {
          expect(actual).to.deep.equal([ { _id: '5', name: 'five' } ]);
          expect(allDocs.callCount).to.equal(1);
          expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
          expect(getSummariesService.get.callCount).to.equal(0);
        });
    });

    it('multiple results', () => {
      allDocs.resolves({
        rows: [
          { doc: { _id: '5', name: 'five' } },
          { doc: { _id: '6', name: 'six' } },
          { doc: { _id: '7', name: 'seven' } }
        ] });

      return service
        .get([ '5', '6', '7' ], { include_docs: true })
        .then(actual => {
          expect(actual).to.deep.equal([
            { _id: '5', name: 'five' },
            { _id: '6', name: 'six' },
            { _id: '7', name: 'seven' }
          ]);
          expect(allDocs.callCount).to.equal(1);
          expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5', '6', '7' ], include_docs: true });
          expect(getSummariesService.get.callCount).to.equal(0);
        });
    });
  });
});
