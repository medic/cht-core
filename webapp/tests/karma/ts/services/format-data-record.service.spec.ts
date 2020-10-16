import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as chai from 'chai'
chai.use(require('chai-exclude'));
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { FormatDataRecordService } from '@mm-services/format-data-record.service';
import { DbService } from '@mm-services/db.service';
import { LanguageService } from '@mm-services/language.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';

describe('FormatDataRecord Service', () => {
  let service:FormatDataRecordService;
  let dbService;
  let languageService;
  let settingService;
  let query;

  beforeEach(() => {
    query = sinon.stub();

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        { provide: DbService, useValue: { get: () => ({ query }) } },
        { provide: LanguageService, useValue: { get: sinon.stub() } },
        { provide: FormatDateService, useValue: { relative: sinon.stub().returns('sometime') } },
        { provide: SettingsService, useValue: { get: sinon.stub() } },
        { provide: TranslateLocaleService, useValue: { instant: sinon.stub() } },
      ]
    });

    service = TestBed.inject(FormatDataRecordService);
    dbService = TestBed.inject(DbService);
    languageService = TestBed.inject(LanguageService);
    settingService = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });

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

    settingService.get.resolves({});
    languageService.get.resolves('en');
    return service.format(doc).then(formatted => {
      expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
      expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
      const row = formatted.scheduled_tasks_by_group[0].rows[0];
      expect(row.messages.length).to.equal(1);
      const message = row.messages[0];
      expect(message.to).to.equal('+123456');
      expect(message.message).to.equal('Some message');
    });
  });

  it('errors messages when they fail to translate', () => {
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
    settingService.get.resolves({});
    languageService.get.resolves('en');
    return service.format(doc).then(formatted => {
      expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
      expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
      const row = formatted.scheduled_tasks_by_group[0].rows[0];
      expect(row.messages.length).to.equal(1);
      const message = row.messages[0];
      expect(message.to).to.equal('+123456');
      expect(message.error).to.equal('messages.errors.message.empty');
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

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
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

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
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

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
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

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
        {
          label: 'report.my-form.patient_id',
          value: '1234',
          depth: 0,
          target: { url: ['/contacts', 'some-patient-id'] }
        },
        {
          label: 'report.my-form.patient_uuid',
          value: 'some-uuid',
          depth: 0,
          target: { url: ['/contacts', 'some-patient-id'] }
        },
        {
          label: 'report.my-form.patient_name',
          value: 'linky mclinkface',
          depth: 0,
          target: { url: ['/contacts', 'some-patient-id'] }
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

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
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

  it('detects generated case_id fields', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      case_id: '1234',
      patient_id: '5678',
      patient: {
        _id: 'abc'
      },
      fields: {
        not_case_id: 'pass'
      }
    };

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
        {
          label: 'case_id',
          value: '1234',
          generated: true,
          target: { filter: 'case_id:1234' }
        },
        {
          label: 'patient_id',
          value: '5678',
          generated: true,
          target: { url: ['/contacts', 'abc'] }
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

  it('should sort scheduled tasks by date within groups', () => {
    const report = {
      _id: 'report',
      form: 'form',
      content_type: 'xml',
      fields: {
        field: '123456',
      },
      scheduled_tasks: [
        {
          due: 100,
          group: 1,
          type: 'type1',
          recipient: 'clinic',
          translation_key: 'key',
          message: 'message1',
        },
        {
          timestamp: 200,
          group: 2,
          type: 'type2',
          recipient: 'reporting_unit',
          message: 'message2',
        },
        {
          timestamp: 50,
          group: 1,
          type: 'type1',
          recipient: 'ancestor:clinic',
          message: 'message3',
        },
        {
          due: 100,
          group: 2,
          type: 'type2',
          recipient: 'ancestor:whatever',
          message: 'message4',
        },
        {
          due: 40,
          group: 1,
          type: 'type1',
          recipient: 'clinic',
          message: 'message5',
        },
        {
          timestamp: 15,
          group: 1,
          type: 'type4',
          recipient: 'clinic',
          message: 'message6',
        },
        {
          timestamp: 200,
          group: 1,
          type: 'type4',
          recipient: 'clinic',
          message: 'message7',
        },
        {
          timestamp: 15,
          group: 3,
          type: 'type4',
          recipient: 'clinic',
          message: 'message8',
        },
      ],
    };

    settingService.get.resolves({});

    return service.format(report).then(result => {
      // @ts-ignore
      expect(result).excludingEvery('uuid').to.deep.equal({
        _id: 'report',
        form: 'form',
        content_type: 'xml',
        fields: [{
          label: 'report.form.field',
          value: '123456',
          target: undefined,
          depth: 0,
        }],
        scheduled_tasks: [
          {
            due: 100,
            group: 1,
            type: 'type1',
            recipient: 'clinic',
            translation_key: 'key',
            message: 'message1',
          },
          {
            timestamp: 200,
            group: 2,
            type: 'type2',
            recipient: 'reporting_unit',
            message: 'message2',
          },
          {
            timestamp: 50,
            group: 1,
            type: 'type1',
            recipient: 'ancestor:clinic',
            message: 'message3',
          },
          {
            due: 100,
            group: 2,
            type: 'type2',
            recipient: 'ancestor:whatever',
            message: 'message4',
          },
          {
            due: 40,
            group: 1,
            type: 'type1',
            recipient: 'clinic',
            message: 'message5',
          },
          {
            timestamp: 15,
            group: 1,
            type: 'type4',
            recipient: 'clinic',
            message: 'message6',
          },
          {
            timestamp: 200,
            group: 1,
            type: 'type4',
            recipient: 'clinic',
            message: 'message7',
          },
          {
            timestamp: 15,
            group: 3,
            type: 'type4',
            recipient: 'clinic',
            message: 'message8',
          },
        ],
        scheduled_tasks_by_group: [
          {
            group: 'type1:1',
            type: 'type1',
            name: undefined,
            number: 1,
            rows: [
              {
                due: 40,
                group: 1,
                type: 'type1',
                recipient: 'clinic',
                message: 'message5',
                messages: [{
                  to: 'clinic',
                  message: 'message5'
                }],
                timestamp: 40,
              },
              {
                timestamp: 50,
                group: 1,
                type: 'type1',
                recipient: 'ancestor:clinic',
                message: 'message3',
                messages: [{
                  to: 'ancestor:clinic',
                  message: 'message3',
                }],
              },
              {
                timestamp: 100,
                due: 100,
                group: 1,
                type: 'type1',
                recipient: 'clinic',
                translation_key: 'key',
                message: 'message1',
                messages: [{
                  to: 'clinic',
                  message: 'message1',
                }],
              },
            ],
          },
          {
            group: 'type2:2',
            name: 'type2:2',
            type: 'type2',
            number: 2,
            rows: [
              {
                due: 100,
                timestamp: 100,
                group: 2,
                type: 'type2',
                recipient: 'ancestor:whatever',
                message: 'message4',
                messages: [{
                  to: 'ancestor:whatever',
                  message: 'message4',
                }],
              },
              {
                timestamp: 200,
                group: 2,
                type: 'type2',
                recipient: 'reporting_unit',
                message: 'message2',
                messages: [{
                  to: 'reporting_unit',
                  message: 'message2',
                }],
              },
            ]
          },
          {
            group: 'type4:1',
            name: 'type4:1',
            type: 'type4',
            number: 1,
            rows: [
              {
                timestamp: 15,
                group: 1,
                type: 'type4',
                recipient: 'clinic',
                message: 'message6',
                messages: [{
                  to: 'clinic',
                  message: 'message6',
                }],
              },
              {
                timestamp: 200,
                group: 1,
                type: 'type4',
                recipient: 'clinic',
                message: 'message7',
                messages: [{
                  to: 'clinic',
                  message: 'message7',
                }]
              }
            ]
          },
          {
            group: 'type4:3',
            name: 'type4:3',
            type: 'type4',
            number: 3,
            rows: [
              {
                timestamp: 15,
                group: 3,
                type: 'type4',
                recipient: 'clinic',
                message: 'message8',
                messages: [{
                  to: 'clinic',
                  message: 'message8',
                }],
              },
            ],
          },
        ],
      });
    });
  });
});
