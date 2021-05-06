import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import * as validation from '@medic/validation';
import { ValidationService } from '@mm-services/validation.service';
import { DbService } from '@mm-services/db.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateLocaleService } from '@mm-services//translate-locale.service';

describe('Validation Service', () => {
  let service:ValidationService;
  let dbService;
  let settingsService;
  let translateLocaleService;

  beforeEach(() => {
    dbService = { get: sinon.stub() };
    settingsService = { get: sinon.stub() };
    translateLocaleService = { instant: sinon.stub() };
    sinon.stub(validation, 'init');
    sinon.stub(validation, 'validate');

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: DbService, useValue: dbService },
        { provide: TranslateLocaleService, useValue: translateLocaleService },
      ]
    });
    service = TestBed.inject(ValidationService);
  });

  afterEach(() => sinon.restore());

  describe('init', () => {
    it('should init', async () => {
      settingsService.get.resolves({ some: 'settings' });

      await service.init();

      expect(settingsService.get.callCount).to.equal(1);
      expect(validation.init.callCount).to.equal(1);
      expect(validation.init.args[0][0].settings).to.deep.equal({ some: 'settings' });
      expect(validation.init.args[0][0].db).to.deep.equal({ medic: dbService.get() });
    });

    it('should only init once', async () => {
      settingsService.get.resolves({ other: 'settings' });

      await service.init();
      await service.init();
      await service.init();

      expect(settingsService.get.callCount).to.equal(1);
      expect(validation.init.callCount).to.equal(1);
    });
  });

  describe('validate', () => {
    it('should init if not inited', async () => {
      settingsService.get.resolves({ the: 'settings' });
      validation.validate.resolves([{ code: 'error', message: 'the error' }]);

      const config = {
        validations:
          {
            list: [
              { property: 'type', rule: 'equals("data_record")' },
            ]
          }
      };
      const result = await service.validate({}, config);

      expect(settingsService.get.callCount).to.equal(1);
      expect(validation.init.callCount).to.equal(1);
      expect(validation.init.args[0][0].settings).to.deep.equal({ the: 'settings' });
      expect(validation.init.args[0][0].db).to.deep.equal({ medic: dbService.get() });
      const translationFn = validation.init.args[0][0].translate;
      translationFn('key', 'locale');
      expect(translateLocaleService.instant.callCount).to.equal(1);
      expect(translateLocaleService.instant.args[0]).to.deep.equal([ 'key', {}, 'locale', true ]);
      expect(validation.validate.callCount).to.equal(1);

      expect(result).to.deep.equal([{ code: 'error', message: 'the error' }]);
    });

    it('should pass correct data to validate', async () => {
      settingsService.get.resolves({ the: 'settings' });
      validation.validate.resolves([]);

      const doc = { _id: 'report', type: 'data_record' };
      const config = {
        validations:
          {
            list: [
              { property: 'type', rule: 'equals("data_record")' },
              { property: '_id', rule: 'required' },
            ]
          }
      };

      const result = await service.validate(doc, config);

      expect(result).to.deep.equal([]);
      expect(validation.validate.callCount).to.equal(1);
      expect(validation.validate.args[0]).to.deep.equal([
        { _id: 'report', type: 'data_record' },
        [
          { property: 'type', rule: 'equals("data_record")' },
          { property: '_id', rule: 'required' },
        ],
      ]);
    });

    it('should translate error messages with provided context', async () => {
      settingsService.get.resolves({ the: 'settings' });
      const context = {
        patient: { name: 'the patient', patient_id: 'aaa' },
      };

      const doc = { _id: 'report', type: 'data_record' };
      const config = {
        validations:
          {
            list: [
              { property: 'type', rule: 'equals("data_record")' },
            ]
          }
      };
      validation.validate.resolves([
        { code: 'invalid_1', message: 'untranslated1 {{patient.name}}' },
        { code: 'invalid_2', message: 'untranslated2 {{patient.name}}' },
      ]);

      const result = await service.validate(doc, config, context);
      expect(result).to.deep.equal([
        { code: 'invalid_1', message: 'untranslated1 the patient' },
        { code: 'invalid_2', message: 'untranslated2 the patient' },
      ]);
    });

    it('should skip validation with invalid config', async () => {
      settingsService.get.resolves({ the: 'settings' });

      const doc = { _id: 'report', type: 'data_record' };
      const result = await service.validate(doc, undefined);

      expect(result).to.deep.equal(undefined);
      expect(validation.validate.callCount).to.equal(0);
    });

    it('should skip validation whn config is missing validation rules', async () => {
      settingsService.get.resolves({ the: 'settings' });

      const doc = { _id: 'report', type: 'data_record' };
      const result = await service.validate(doc, {});

      expect(result).to.deep.equal(undefined);
      expect(validation.validate.callCount).to.equal(0);
    });

    it('should skip validation if no validation rules are defined', async () => {
      settingsService.get.resolves({ the: 'settings' });

      const doc = { _id: 'report', type: 'data_record' };
      const result = await service.validate(doc, { validations: {} });

      expect(result).to.deep.equal(undefined);
      expect(validation.validate.callCount).to.equal(0);
    });

    it('should skip validation if no validations', async () => {
      settingsService.get.resolves({ the: 'settings' });

      const doc = { _id: 'report', type: 'data_record' };
      const result = await service.validate(doc, { validations: { list: [] } });

      expect(result).to.deep.equal(undefined);
      expect(validation.validate.callCount).to.equal(0);
    });
  });
});
