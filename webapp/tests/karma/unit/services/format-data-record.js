describe('FormatDataRecord service', () => {

  'use strict';

  const Settings = sinon.stub();
  const Language = sinon.stub();

  let service;

  beforeEach(() => {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Settings', Settings);
      $provide.value('Language', Language);
      $provide.value('FormatDate', {
        relative: function() {
          return 'sometime';
        }
      });
      $provide.factory('DB', KarmaUtils.mockDB({ }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(_FormatDataRecord_ => {
      service = _FormatDataRecord_;
    });
  });

  afterEach(() => sinon.restore());

  it('generates cleared messages', () => {
    const doc = {
      from: '+123456',
      scheduled_tasks: [
        {
          message: 'Some message',
          state: 'cleared',
          recipient: 'reporting_unit'
        }
      ]
    };
    const settings = {};
    Settings.returns(Promise.resolve(settings));
    Language.returns(Promise.resolve('en'));
    return service(doc).then(formatted => {
      chai.expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
      chai.expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
      const row = formatted.scheduled_tasks_by_group[0].rows[0];
      chai.expect(row.messages.length).to.equal(1);
      const message = row.messages[0];
      chai.expect(message.to).to.equal('+123456');
      chai.expect(message.message).to.equal('Some message');
    });
  });

  it('errors messages when they fail to transate', () => {
    const doc = {
      from: '+123456',
      scheduled_tasks: [
        {
          message_key: 'some.message',
          state: 'cleared',
          recipient: 'reporting_unit'
        }
      ]
    };
    const settings = {};
    Settings.returns(Promise.resolve(settings));
    Language.returns(Promise.resolve('en'));
    return service(doc).then(formatted => {
      chai.expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
      chai.expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
      const row = formatted.scheduled_tasks_by_group[0].rows[0];
      chai.expect(row.messages.length).to.equal(1);
      const message = row.messages[0];
      chai.expect(message.to).to.equal('+123456');
      chai.expect(message.error).to.equal('messages.errors.message.empty');
    });
  });

  it('when fields are nested within hidden groups, the nested fields are hidden', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      hidden_fields: ['group'],
      fields: {
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
      }
    };

    return service(report).then(result => {
      chai.expect(result.fields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0, target: undefined },
        { label: 'report.my-form.group3', depth: 0 },
        { label: 'report.my-form.group3.field4', value: 3, depth: 1, target: undefined },
      ]);
    });
  });

  it('returns correct deep display fields', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      fields: {
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
      }
    };

    return service(report).then(result => {
      chai.expect(result.fields).to.deep.equal([
        { label: 'report.my-form.field1', value: 1, depth: 0, target: undefined },
        { label: 'report.my-form.fields', depth: 0 },
        { label: 'report.my-form.fields.field21', value: 1, depth: 1, target: undefined },
        { label: 'report.my-form.fields.fields', depth: 1 },
        { label: 'report.my-form.fields.fields.field31', value: 1, depth: 2, target: undefined },
        { label: 'report.my-form.fields.fields.fields', depth: 2 },
        { label: 'report.my-form.fields.fields.fields.field41', value: 1, depth: 3, target: undefined },
        { label: 'report.my-form.fields.fields.fields.fields', depth: 3 },
        { label: 'report.my-form.fields.fields.fields.fields.field51', value: 1, depth: 3, target: undefined }
      ]);
    });
  });

  it('returns correct image path', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      fields: {
        image: 'some image',
        deep: { image2: 'other' }
      },
      _attachments: {
        'user-file/my-form/image': { content_type: 'image/gif' },
        'user-file/my-form/deep/image2': { content_type: 'image/png' }
      }
    };

    return service(report).then(result => {
      chai.expect(result.fields).to.deep.equal([
        {
          label: 'report.my-form.image',
          value: 'some image',
          depth: 0,
          imagePath: 'user-file/my-form/image',
          target: undefined
        },
        {
          label: 'report.my-form.deep',
          depth: 0
        },
        {
          label: 'report.my-form.deep.image2',
          value: 'other',
          depth: 1,
          imagePath: 'user-file/my-form/deep/image2',
          target: undefined
        }
      ]);
    });
  });

  it('detects links to patients', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      patient: { _id: 'some-patient-id' },
      fields: {
        patient_id: '1234',
        patient_uuid: 'some-uuid',
        patient_name: 'linky mclinkface',
        not_patient_id: 'pass'
      }
    };

    return service(report).then(result => {
      chai.expect(result.fields).to.deep.equal([
        {
          label: 'report.my-form.patient_id',
          value: '1234',
          depth: 0,
          target: { url: { route: 'contacts.detail', params: { id: 'some-patient-id' } } }
        },
        {
          label: 'report.my-form.patient_uuid',
          value: 'some-uuid',
          depth: 0,
          target: { url: { route: 'contacts.detail', params: { id: 'some-patient-id' } } }
        },
        {
          label: 'report.my-form.patient_name',
          value: 'linky mclinkface',
          depth: 0,
          target: { url: { route: 'contacts.detail', params: { id: 'some-patient-id' } } }
        },
        {
          label: 'report.my-form.not_patient_id',
          value: 'pass',
          depth: 0,
          target: undefined
        }
      ]);
    });
  });

  it('detects links to cases', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      fields: {
        case_id: '1234',
        not_case_id: 'pass'
      }
    };

    return service(report).then(result => {
      chai.expect(result.fields).to.deep.equal([
        {
          label: 'report.my-form.case_id',
          value: '1234',
          depth: 0,
          target: { filter: 'case_id:1234' }
        },
        {
          label: 'report.my-form.not_case_id',
          value: 'pass',
          depth: 0,
          target: undefined
        }
      ]);
    });
  });

});
