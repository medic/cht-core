describe('ReportViewModelGenerator service', () => {

  'use strict';

  let service,
      formatDataRecord,
      lineageModelGenerator,
      getSubjectSummaries,
      getSummaries,
      report;

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
      $provide.value('DB', {});
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
      chai.expect(lineageModelGenerator.report.args[0]).to.deep.equal([ 'my-report', { merge: true } ]);

      chai.expect(formatDataRecord.callCount).to.equal(1);
      chai.expect(formatDataRecord.args[0]).to.deep.equal([report]);

      chai.expect(getSummaries.callCount).to.equal(1);
      chai.expect(getSummaries.args[0]).to.deep.equal([[ 'my-report' ]]);

      chai.expect(getSubjectSummaries.callCount).to.equal(1);
      chai.expect(getSubjectSummaries.args[0]).to.deep.equal([[{ summary: true }], true]);

      chai.expect(result.doc).to.deep.equal(report);
      chai.expect(result.formatted).to.deep.equal({ formatted1: 1, formatted2: 2, subject: 'subject' });
      chai.expect(result.displayFields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0 },
        { label: 'report.my-form.field3', value: 3, depth: 0 },
      ]);
    });
  });

  it('when fields are nested within hidden groups, the nested fields are hidden', () => {
    lineageModelGenerator.report.resolves({ doc: report });
    formatDataRecord.resolves({});
    getSubjectSummaries.resolves([{}]);
    getSummaries.resolves([{}]);

    report.fields = {
      field1: 1,
      group: {
        field2: 2,
        group2: {
          field3: 3,
        }
      },
      group3: {
        field4: 3,
      },
    };
    report.hidden_fields = ['group'];

    return service(report._id).then(result => {
      chai.expect(result.displayFields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0 },
        { label: 'report.my-form.group3', depth: 0 },
        { label: 'report.my-form.group3.field4', value: 3, depth: 1 },
      ]);
    });
  });

  it('returns correct deep display fields', () => {
    lineageModelGenerator.report.resolves({ doc: report });
    formatDataRecord.resolves({});
    getSubjectSummaries.resolves([{}]);
    getSummaries.resolves([{}]);

    report.fields = {
      field1: 1,
      fields: {
        field21: 1,
        fields: {
          field31: 1,
          fields: {
            field41: 1,
            fields: {
              field51: 1
            }
          }
        }
      }
    };

    return service(report._id).then(result => {
      chai.expect(result.displayFields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0 },
        { label: 'report.my-form.fields', depth: 0 },
        { label: 'report.my-form.fields.field21', value: 1, depth: 1 },
        { label: 'report.my-form.fields.fields', depth: 1 },
        { label: 'report.my-form.fields.fields.field31', value: 1, depth: 2 },
        { label: 'report.my-form.fields.fields.fields', depth: 2 },
        { label: 'report.my-form.fields.fields.fields.field41', value: 1, depth: 3 },
        { label: 'report.my-form.fields.fields.fields.fields', depth: 3 },
        { label: 'report.my-form.fields.fields.fields.fields.field51', value: 1, depth: 3 }
      ]);
    });
  });

  it('returns correct image path', () => {
    lineageModelGenerator.report.resolves({ doc: report });
    formatDataRecord.resolves({});
    getSubjectSummaries.resolves([{}]);
    getSummaries.resolves([{}]);

    report.fields.image = 'some image';
    report.fields.deep = { image2: 'other' };
    report._attachments = {
      'user-file/my-form/image': { content_type: 'image/gif' },
      'user-file/my-form/deep/image2': { content_type: 'image/png' }
    };

    return service(report._id).then(result => {
      chai.expect(result.displayFields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0 },
        { label: 'report.my-form.field3', value: 3, depth: 0 },
        { label: 'report.my-form.image', value: 'some image', depth: 0, imagePath: 'user-file/my-form/image' },
        { label: 'report.my-form.deep', depth: 0 },
        { label: 'report.my-form.deep.image2', value: 'other', depth: 1, imagePath: 'user-file/my-form/deep/image2' }
      ]);
    });
  });
});
