describe('ReportViewModelGenerator service', () => {

  'use strict';

  let service,
      formatDataRecord,
      lineageModelGenerator,
      getSubjectSummaries,
      getSummaries,
      report,
      formatted;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      report = {
        _id: 'my-report',
        form: 'my-form',
        fields: {
          field1: 1,
          field2: 2,
          field3: 3
        },
        hidden_fields: ['field2'],
        _attachments: {
          content: { content_type: 'application/xml'},
          'user-file/my-form/field1': { content_type: 'text/html' },
          'user-file/my-form/field2': { something: '1' },
          'user-file/my-form/fields/field21': { foo: 'bar' }
        }
      };

      formatted = { formatted1: 1, formatted2: 2 };

      lineageModelGenerator = { report: sinon.stub().resolves({ doc: report }) };
      formatDataRecord = sinon.stub().resolves(formatted);
      getSubjectSummaries = sinon.stub().resolves([{ summary: true, subject: 'subject' }]);
      getSummaries = sinon.stub().resolves([{ summary: true }]);

      $provide.value('LineageModelGenerator', lineageModelGenerator);
      $provide.value('FormatDataRecord', formatDataRecord);
      $provide.value('GetSubjectSummaries', getSubjectSummaries);
      $provide.value('GetSummaries', getSummaries);
      $provide.value('DB', {});
    });
    inject(_ReportViewModelGenerator_ => service = _ReportViewModelGenerator_);
  });

  it('calls services with correct params, returns formatted data and display fields', () => {
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
      console.log(result.displayFields);
      chai.expect(result.displayFields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0 },
        { label: 'report.my-form.field3', value: 3, depth: 0 },

      ]);
    });
  });

  it('returns correct deep display fields', () => {
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
