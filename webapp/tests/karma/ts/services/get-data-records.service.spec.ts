import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { DbService } from '@mm-services/db.service';
import { HydrateContactNamesService } from '@mm-services/hydrate-contact-names.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';

describe('GetDataRecords service', () => {
  let service:GetDataRecordsService;
  let allDocs;
  let GetSummaries;
  let HydrateContactNames;

  beforeEach(() => {
    allDocs = sinon.stub();
    GetSummaries = sinon.stub();
    HydrateContactNames = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ allDocs }) } },
        { provide: HydrateContactNamesService, useValue: { get: HydrateContactNames } },
        { provide: GetSummariesService, useValue: { get: GetSummaries } },
      ]
    });

    service = TestBed.inject(GetDataRecordsService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('returns empty array when given no ids', () => {
    return service.get().then(actual => expect(actual).to.deep.equal([]));
  });

  it('returns empty array when given empty array', () => {
    return service.get([]).then(actual => expect(actual).to.deep.equal([]));
  });

  describe('summaries', () => {

    it('db errors', () => {
      GetSummaries.rejects('missing');
      return service.get('5')
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => expect(err.name).to.equal('missing'));
    });

    it('no result', () => {
      GetSummaries.resolves(null);
      HydrateContactNames.resolves([]);
      return service.get('5').then(actual => {
        expect(actual).to.equal(null);
        expect(GetSummaries.callCount).to.equal(1);
        expect(GetSummaries.args[0][0]).to.deep.equal(['5']);
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
      GetSummaries.resolves([
        {
          _id: '5',
          name: 'five',
          contact: 'a',
          lineage: [ 'b', 'c' ]
        }
      ]);
      HydrateContactNames.resolves([ expected ]);
      return service.get('5', { hydrateContactNames: true }).then(actual => {
        expect(actual).to.deep.equal(expected);
        expect(GetSummaries.callCount).to.equal(1);
        expect(allDocs.callCount).to.equal(0);
        expect(HydrateContactNames.callCount).to.equal(1);
        expect(HydrateContactNames.args[0][0]).to.deep.equal([{
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
      GetSummaries.resolves([
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ]);
      HydrateContactNames.resolves(expected);
      return service.get([ '5', '6', '7' ], { hydrateContactNames: true }).then(actual => {
        expect(actual).to.deep.equal(expected);
        expect(GetSummaries.callCount).to.equal(1);
        expect(GetSummaries.args[0][0]).to.deep.equal([ '5', '6', '7' ]);
        expect(allDocs.callCount).to.equal(0);
      });
    });

  });

  describe('details', () => {

    it('db errors', () => {
      allDocs.rejects('missing');
      return service.get('5', { include_docs: true })
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => expect(err.name).to.equal('missing'));
    });

    it('no result', () => {
      allDocs.resolves({ rows: [] });
      return service.get('5', { include_docs: true }).then(actual => {
        expect(actual).to.equal(null);
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        expect(GetSummaries.callCount).to.equal(0);
      });
    });

    it('single result', () => {
      allDocs.resolves({
        rows: [
          { doc: { _id: '5', name: 'five' } }
        ] });
      return service.get('5', { include_docs: true }).then(actual => {
        expect(actual).to.deep.equal({ _id: '5', name: 'five' });
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        expect(GetSummaries.callCount).to.equal(0);
      });
    });

    it('multiple results', () => {
      allDocs.resolves({
        rows: [
          { doc: { _id: '5', name: 'five' } },
          { doc: { _id: '6', name: 'six' } },
          { doc: { _id: '7', name: 'seven' } }
        ] });
      return service.get([ '5', '6', '7' ], { include_docs: true }).then(actual => {
        expect(actual).to.deep.equal([
          { _id: '5', name: 'five' },
          { _id: '6', name: 'six' },
          { _id: '7', name: 'seven' }
        ]);
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5', '6', '7' ], include_docs: true });
        expect(GetSummaries.callCount).to.equal(0);
      });
    });
  });
});
