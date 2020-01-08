describe('ReportViewModelGenerator service', () => {

  'use strict';

  let service;
  let formatDataRecord;
  let lineageModelGenerator;
  let getSubjectSummaries;
  let getSummaries;
  let report;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      report = {
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

      lineageModelGenerator = { report: sinon.stub() };
      formatDataRecord = sinon.stub();
      getSubjectSummaries = sinon.stub();
      getSummaries = sinon.stub();

      $provide.value('LineageModelGenerator', lineageModelGenerator);
      $provide.value('FormatDataRecord', formatDataRecord);
      $provide.value('GetSubjectSummaries', getSubjectSummaries);
      $provide.value('GetSummaries', getSummaries);
    });
    inject(_ReportViewModelGenerator_ => service = _ReportViewModelGenerator_);
  });

  afterEach(() => sinon.restore());

  it('calls services with correct params, returns formatted data and display fields', () => {
    lineageModelGenerator.report.resolves({ doc: report });
    formatDataRecord.resolves({ formatted1: 1, formatted2: 2 });
    getSubjectSummaries.resolves([{ summary: true, subject: 'subject' }]);
    getSummaries.resolves([{ summary: true }]);

    return service(report._id).then(result => {
      chai.expect(lineageModelGenerator.report.callCount).to.equal(1);
      chai.expect(lineageModelGenerator.report.args[0]).to.deep.equal([ 'my-report' ]);

      chai.expect(formatDataRecord.callCount).to.equal(1);
      chai.expect(formatDataRecord.args[0]).to.deep.equal([report]);

      chai.expect(getSummaries.callCount).to.equal(1);
      chai.expect(getSummaries.args[0]).to.deep.equal([[ 'my-report' ]]);

      chai.expect(getSubjectSummaries.callCount).to.equal(1);
      chai.expect(getSubjectSummaries.args[0]).to.deep.equal([[{ summary: true }], true]);

      chai.expect(result.doc).to.deep.equal(report);
      chai.expect(result.formatted).to.deep.equal({ formatted1: 1, formatted2: 2, subject: 'subject' });
    });
  });

});
