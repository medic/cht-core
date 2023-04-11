import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { JsonFormsService } from '@mm-services/json-forms.service';

describe('JsonForms service', () => {
  let service:JsonFormsService;
  let settings;

  beforeEach(() => {
    settings = sinon.stub();
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { get: settings } },
      ]
    });

    service = TestBed.inject(JsonFormsService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('returns zero when no forms', () => {
    settings.resolves({ forms: {} });
    return service.get().then((actual) => {
      expect(actual).to.deep.equal([]);
    });
  });

  it('returns forms with names and translation keys', () => {
    settings.resolves({
      forms: {
        A: { meta: { code: 'A', label: 'First',  icon: 'a' } },
        B: { meta: { code: 'B', label: 'Second', icon: 'b' } },
        C: { meta: { code: 'C', label: 'Third',  icon: 'c' } },
        D: { meta: { code: 'D', translation_key: 'Fourth', icon: 'd' } },
        E: { meta: { code: 'E', subject_key: 'Fifth', icon: 'd' } }
      } });
    return service.get().then((actual) => {
      expect(actual).to.deep.equal([
        { code: 'A', name: 'First',   translation_key: undefined, icon: 'a', subject_key: undefined },
        { code: 'B', name: 'Second',  translation_key: undefined, icon: 'b', subject_key: undefined },
        { code: 'C', name: 'Third',   translation_key: undefined, icon: 'c', subject_key: undefined },
        { code: 'D', name: undefined, translation_key: 'Fourth', icon: 'd', subject_key: undefined },
        { code: 'E', name: undefined, translation_key: undefined, icon: 'd', subject_key: 'Fifth'   },
      ]);
    });
  });

  it('handles forms with no label', () => {
    settings.resolves({
      forms: {
        A: { meta: { code: 'A' } },
        B: { meta: { code: 'B', icon: 'b' } },
        C: { meta: { code: 'C', label: 'Third' } },
        D: { meta: { code: 'D' } }
      } });
    return service.get().then((actual) => {
      expect(actual).to.deep.equal([
        { code: 'A', name: undefined, translation_key: undefined, icon: undefined, subject_key: undefined },
        { code: 'B', name: undefined, translation_key: undefined, icon: 'b', subject_key: undefined },
        { code: 'C', name: 'Third',   translation_key: undefined, icon: undefined, subject_key: undefined },
        { code: 'D', name: undefined, translation_key: undefined, icon: undefined, subject_key: undefined }
      ]);
    });
  });

});

