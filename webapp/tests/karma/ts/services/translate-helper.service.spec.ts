import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { TranslateHelperService } from '@mm-services/translate-helper.service';

describe('TranslateHelperService', () => {
  let service:TranslateHelperService;
  let translateService;

  beforeEach(() => {
    translateService = { get: sinon.stub().callsFake((arg) => of(arg)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
      ]
    });
    service = TestBed.inject(TranslateHelperService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {
    it('should get translated value', (async () => {
      const expected = 'expected translation';
      const actual = await service.get(expected);

      expect(actual).to.equal(expected);
      expect(translateService.get.callCount).to.equal(1);
      expect(translateService.get.args[0]).to.deep.equal([expected, undefined]);
    }));

    it('should pass interpolation params', async () => {
      const expected = 'expected translation';
      const params = { param: 'one', other: 'two' };
      const actual = await service.get(expected, params);

      expect(actual).to.equal(expected);
      expect(translateService.get.callCount).to.equal(1);
      expect(translateService.get.args[0]).to.deep.equal([expected, params]);
    });
  });

  describe('fieldIsRequired', () => {
    it('should translate field value correctly', async () => {
      const field = 'field value';
      const actual = await service.fieldIsRequired(field);

      expect(actual).to.equal('field is required');

      expect(translateService.get.callCount).to.equal(2);
      expect(translateService.get.args[0]).to.deep.equal([field, undefined]);
      expect(translateService.get.args[1]).to.deep.equal(['field is required', { field }]);
    });
  });
});
