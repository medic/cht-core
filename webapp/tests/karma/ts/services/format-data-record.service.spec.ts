import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiExclude from 'chai-exclude';
//@ts-ignore
chai.use(chaiExclude);

import { FormatDataRecordService } from '@mm-services/format-data-record.service';
import { SettingsService } from '@mm-services/settings.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { LanguageService } from '@mm-services/language.service';
import { DbService } from '@mm-services/db.service';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';

describe('FormatDataRecord service', () => {
  let Settings;
  let Language;
  let db;
  let translateLocaleService;

  let service;

  beforeEach(() => {
    Settings = sinon.stub();
    Language = sinon.stub();
    db = { query: sinon.stub() };
    translateLocaleService = { instant: sinon.stub().returnsArg(0) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { get: Settings } },
        { provide: LanguageService, useValue: { get: Language } },
        { provide: FormatDateService, useValue: { relative: sinon.stub().returns('sometime') } },
        { provide: DbService, useValue: { get: () => db } },
        { provide: TranslateLocaleService, useValue: translateLocaleService },
      ]
    });
    service = TestBed.inject(FormatDataRecordService);
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
    Settings.resolves(settings);
    Language.resolves('en');
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
    const settings = {};
    Settings.resolves(settings);
    Language.resolves('en');
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

  it('detects links to places', () => {
    const report = {
      _id: 'my-report',
      form: 'my-form',
      content_type: 'xml',
      place: { _id: 'some-place-id' },
      fields: {
        place_id: '1234',
        not_place_id: 'pass'
      }
    };

    return service.format(report).then(result => {
      expect(result.fields).to.deep.equal([
        {
          label: 'report.my-form.place_id',
          value: '1234',
          depth: 0,
          target: { url: ['/contacts', 'some-place-id'] }
        },
        {
          label: 'report.my-form.not_place_id',
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

  describe('generating messages', () => {
    it('should generate messages with patient', () => {
      const report = {
        _id: 'report',
        form: 'frm',
        fields: { patient_id: '12345', },
        patient: { _id: 'p_uuid', patient_id: '12345', name: 'alpha' },
        contact: { _id: 'submitter', phone: '+40858585' },
        scheduled_tasks: [
          {
            due: 10,
            group: 1,
            type: 1,
            message_key: 'message1',
            recipient: 'reporting_unit',
          },
          {
            due: 20,
            group: 1,
            type: 1,
            message_key: 'message2',
            recipient: 'reporting_unit',
          },
        ],
      };

      translateLocaleService.instant
        .withArgs('message1').returns('Patient {{patient_name}} was registered at {{registered_at}}')
        .withArgs('message2').returns('Patient {{patient_name}} is {{age}} years old');

      const registration = {
        _id: 'reg',
        form: 'reg',
        type: 'data_record',
        content_type: 'xml',
        fields: { registered_at: 'mar 11', age: '22' },
      };
      db.query.resolves({ rows: [{ doc: registration }] });
      Settings.resolves({ registrations: [{ form: 'reg' }]});

      return service.format(report).then(formatted => {
        expect(db.query.callCount).to.equal(1);
        expect(db.query.args[0]).to.deep.equal([
          'medic-client/registered_patients',
          { key: '12345', include_docs: true }
        ]);

        expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[0]).excludingEvery('uuid').to.deep.equal({
          due: 10,
          group: 1,
          type: 1,
          message_key: 'message1',
          recipient: 'reporting_unit',
          timestamp: 10,
          messages: [{
            to: report.contact.phone,
            message: 'Patient alpha was registered at mar 11',
          }]
        });
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[1]).excludingEvery('uuid').to.deep.equal({
          due: 20,
          group: 1,
          type: 1,
          message_key: 'message2',
          recipient: 'reporting_unit',
          timestamp: 20,
          messages: [{
            to: report.contact.phone,
            message: 'Patient alpha is 22 years old',
          }]
        });
      });
    });

    it('should generate messages with place', () => {
      const report = {
        _id: 'report',
        form: 'frm',
        fields: { place_id: '789', },
        place: { _id: 'p_uuid', place_id: '789', name: 'omega' },
        contact: { _id: 'submitter', phone: '+40858585' },
        scheduled_tasks: [
          {
            due: 100,
            group: 1,
            type: 1,
            message_key: 'message1',
            recipient: 'reporting_unit',
          },
          {
            due: 200,
            group: 1,
            type: 1,
            message_key: 'message2',
            recipient: 'reporting_unit',
          },
        ],
      };

      translateLocaleService.instant
        .withArgs('message1').returns('Place {{place.name}} was registered at {{registered_at}}')
        .withArgs('message2').returns('Place {{place.name}} has a population of {{population}}');

      const registration = {
        _id: 'reg',
        form: 'reg',
        type: 'data_record',
        content_type: 'xml',
        fields: { registered_at: 'mar 21', population: '5000' },
      };
      db.query.resolves({ rows: [{ doc: registration }] });
      Settings.resolves({ registrations: [{ form: 'reg' }]});

      return service.format(report).then(formatted => {
        expect(db.query.callCount).to.equal(1);
        expect(db.query.args[0]).to.deep.equal([
          'medic-client/registered_patients',
          { key: '789', include_docs: true }
        ]);

        expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[0]).excludingEvery('uuid').to.deep.equal({
          due: 100,
          group: 1,
          type: 1,
          message_key: 'message1',
          recipient: 'reporting_unit',
          timestamp: 100,
          messages: [{
            to: report.contact.phone,
            message: 'Place omega was registered at mar 21',
          }]
        });
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[1]).excludingEvery('uuid').to.deep.equal({
          due: 200,
          group: 1,
          type: 1,
          message_key: 'message2',
          recipient: 'reporting_unit',
          timestamp: 200,
          messages: [{
            to: report.contact.phone,
            message: 'Place omega has a population of 5000',
          }]
        });
      });
    });

    it('should generate messages with patient and place', () => {
      const report = {
        _id: 'report',
        form: 'frm',
        fields: { place_id: '789', patient_id: '123456'},
        patient: { _id: 'patient_uuid', patient_id: '123456', name: 'alpha' },
        place: { _id: 'p_uuid', place_id: '789', name: 'omega' },
        contact: { _id: 'submitter', phone: '+40858585' },
        scheduled_tasks: [
          {
            due: 100,
            group: 1,
            type: 1,
            message_key: 'message1',
            recipient: 'reporting_unit',
          },
          {
            due: 200,
            group: 1,
            type: 1,
            message_key: 'message2',
            recipient: 'reporting_unit',
          },
        ],
      };

      translateLocaleService.instant
        .withArgs('message1').returns('Place {{place.name}}, population {{population}}, age {{age}}')
        .withArgs('message2').returns('Patient {{patient_name}} belongs to {{place.name}}');

      const placeRegistration = {
        _id: 'reg',
        form: 'reg',
        type: 'data_record',
        content_type: 'xml',
        fields: { registered_at: 'mar 21', population: '5000' },
      };

      const patientRegistration = {
        _id: 'reg',
        form: 'reg',
        type: 'data_record',
        content_type: 'xml',
        fields: { registered_at: 'mar 11', age: '22' },
      };
      db.query
        .onCall(0).resolves({ rows: [{ doc: patientRegistration }] })
        .onCall(1).resolves({ rows: [{ doc: placeRegistration }] });
      Settings.resolves({ registrations: [{ form: 'reg' }]});

      return service.format(report).then(formatted => {
        expect(db.query.callCount).to.equal(2);
        expect(db.query.args[0]).to.deep.equal([
          'medic-client/registered_patients',
          { key: '123456', include_docs: true }
        ]);
        expect(db.query.args[1]).to.deep.equal([
          'medic-client/registered_patients',
          { key: '789', include_docs: true }
        ]);

        expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted.length).to.equal(2);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[0]).excludingEvery('uuid').to.deep.equal({
          due: 100,
          group: 1,
          type: 1,
          message_key: 'message1',
          recipient: 'reporting_unit',
          timestamp: 100,
          messages: [{
            to: report.contact.phone,
            message: 'Place omega, population 5000, age 22',
          }]
        });
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[1]).excludingEvery('uuid').to.deep.equal({
          due: 200,
          group: 1,
          type: 1,
          message_key: 'message2',
          recipient: 'reporting_unit',
          timestamp: 200,
          messages: [{
            to: report.contact.phone,
            message: 'Patient alpha belongs to omega',
          }]
        });
      });
    });

    it('should generate messages in the correct language', () => {
      const report = {
        _id: 'report',
        form: 'frm',
        locale: 'fr',
        fields: { place_id: '789', },
        place: { _id: 'p_uuid', place_id: '789', name: 'omega' },
        contact: { _id: 'submitter', phone: '+40858585' },
        scheduled_tasks: [
          {
            due: 100,
            group: 1,
            type: 1,
            message_key: 'message1',
            recipient: 'reporting_unit',
          },
        ],
      };

      translateLocaleService.instant.withArgs('message1').returns('message contents');
      db.query.resolves({ rows: [] });
      Settings.resolves({});

      return service.format(report).then(formatted => {
        expect(translateLocaleService.instant.callCount).to.equal(1);
        expect(translateLocaleService.instant.args[0]).to.deep.equal([ 'message1', null, 'fr', true ]);

        expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted.length).to.equal(1);
        expect(formatted.scheduled_tasks_by_group[0].rows_sorted[0]).excludingEvery('uuid').to.deep.equal({
          due: 100,
          group: 1,
          type: 1,
          message_key: 'message1',
          recipient: 'reporting_unit',
          timestamp: 100,
          messages: [{
            to: report.contact.phone,
            message: 'message contents',
          }]
        });
      });
    });
  });

});
