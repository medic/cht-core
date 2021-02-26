import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';


import { FormatDataRecordService } from '@mm-services/format-data-record.service';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';
import { GetSubjectSummariesService } from '@mm-services/get-subject-summaries.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

describe('ReportViewModelGeneratorService Service', () => {
  let service:ReportViewModelGeneratorService;
  let formatDataRecordService;
  let getSubjectSummariesService;
  let getSummariesService;
  let lineageModelGeneratorService;

  beforeEach(() => {
    formatDataRecordService = { format: sinon.stub() };
    getSubjectSummariesService = { get: sinon.stub() };
    getSummariesService = { get: sinon.stub() };
    lineageModelGeneratorService = { report: sinon.stub() };
    TestBed.configureTestingModule({
      providers: [
        { provide: FormatDataRecordService, useValue: formatDataRecordService },
        { provide: GetSubjectSummariesService, useValue: getSubjectSummariesService },
        { provide: GetSummariesService, useValue: getSummariesService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
      ]
    });

    service = TestBed.inject(ReportViewModelGeneratorService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls services with correct params, returns formatted data and display fields', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      fields: {
        field: 0,
        field1: 1,
        field3: 3
      },
      hidden_fields: ['field'],
      _attachments: {
        content: { content_type: 'application/xml' },
        'user-file/my-form/field': { something: '1' },
        'user-file/my-form/field1': { content_type: 'text/html' },
        'user-file/my-form/fields/field21': { foo: 'bar' },
      }
    };

    lineageModelGeneratorService.report.resolves({ doc: report });
    formatDataRecordService.format.resolves({ formatted1: 1, formatted2: 2 });
    getSubjectSummariesService.get.resolves([{ summary: true, subject: 'subject' }]);
    getSummariesService.get.resolves([{ summary: true }]);

    return service.get(report._id).then(result => {
      expect(lineageModelGeneratorService.report.callCount).to.equal(1);
      expect(lineageModelGeneratorService.report.args[0]).to.deep.equal([ 'my-report' ]);

      expect(formatDataRecordService.format.callCount).to.equal(1);
      expect(formatDataRecordService.format.args[0]).to.deep.equal([report]);

      expect(getSummariesService.get.callCount).to.equal(1);
      expect(getSummariesService.get.args[0]).to.deep.equal([[ 'my-report' ]]);

      expect(getSubjectSummariesService.get.callCount).to.equal(1);
      expect(getSubjectSummariesService.get.args[0]).to.deep.equal([[{ summary: true }], true]);

      expect(result.doc).to.deep.equal(report);
      expect(result.formatted).to.deep.equal({ formatted1: 1, formatted2: 2, subject: 'subject' });
    });
  });

});
