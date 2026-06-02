import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GetSummariesService } from '@mm-services/get-summaries.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

describe('GetSummaries service', () => {
  let service: GetSummariesService;
  let getContactSummaries;
  let getReportSummaries;

  beforeEach(() => {
    getContactSummaries = sinon.stub();
    getReportSummaries = sinon.stub();

    const bind = sinon.stub();
    bind.onFirstCall().returns(getContactSummaries);
    bind.onSecondCall().returns(getReportSummaries);

    TestBed.configureTestingModule({
      providers: [
        { provide: CHTDatasourceService, useValue: { bind } },
      ]
    });

    service = TestBed.inject(GetSummariesService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns empty array when given no ids', async () => {
    const actual = await service.get();
    expect(actual).to.deep.equal([]);
    expect(getContactSummaries.notCalled).to.be.true;
    expect(getReportSummaries.notCalled).to.be.true;
  });

  it('returns empty array when given empty array', async () => {
    const actual = await service.get([]);
    expect(actual).to.deep.equal([]);
    expect(getContactSummaries.notCalled).to.be.true;
    expect(getReportSummaries.notCalled).to.be.true;
  });

  it('merges contact and report summaries from the datasource', async () => {
    const contactSummaries = [{ _id: 'a', name: 'james' }];
    const reportSummaries = [{ _id: 'b', form: 'delivery' }];
    getContactSummaries.resolves(contactSummaries);
    getReportSummaries.resolves(reportSummaries);

    const actual = await service.get(['a', 'b']);

    expect(getContactSummaries.calledOnceWithExactly(['a', 'b'])).to.be.true;
    expect(getReportSummaries.calledOnceWithExactly(['a', 'b'])).to.be.true;
    expect(actual).to.deep.equal([
      { _id: 'a', name: 'james' },
      { _id: 'b', form: 'delivery' },
    ]);
  });

  describe('getByDocs', () => {
    it('returns empty array when given no docs', () => {
      expect(service.getByDocs(undefined)).to.deep.equal([]);
      expect(service.getByDocs([])).to.deep.equal([]);
    });

    it('summarises reports', () => {
      const docs = [{
        _id: 'a',
        _rev: '1',
        type: 'data_record',
        form: 'delivery',
        from: '+123',
        contact: {
          _id: 'c',
          phone: '+456',
          parent: {
            _id: 'd',
            parent: {
              _id: 'e'
            }
          }
        },
        verified: true,
        reported_date: 100,
        fields: {
          patient_name: 'jeff',
          patient_id: 'f'
        }
      }];

      const actual = service.getByDocs(docs);

      expect(actual).to.deep.equal([{
        _id: 'a',
        _rev: '1',
        from: '+123',
        phone: '+456',
        form: 'delivery',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 100,
        contact: 'c',
        lineage: ['d', 'e'],
        subject: {
          name: 'jeff',
          value: 'f',
          type: 'reference'
        },
        case_id: undefined,
      }]);
    });

    it('summarises contacts', () => {
      const docs = [{
        _id: 'a',
        _rev: '1',
        type: 'person',
        name: 'james',
        phone: '+456',
        contact: {
          _id: 'c'
        },
        date_of_death: 999
      }];

      const actual = service.getByDocs(docs);

      expect(actual).to.deep.equal([{
        _id: 'a',
        _rev: '1',
        name: 'james',
        phone: '+456',
        type: 'person',
        contact_type: undefined,
        contact: 'c',
        lineage: [],
        date_of_death: 999,
        muted: undefined,
      }]);
    });

    it('ignores other doc types', () => {
      const docs = [{ type: 'form' }];
      expect(service.getByDocs(docs)).to.deep.equal([]);
    });
  });
});
