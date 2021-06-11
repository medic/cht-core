import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { TranslateService } from '@mm-services/translate.service';

describe('TranslateHelperService', () => {
  let service:TranslateService;
  let ngxTranslateService;

  beforeEach(() => {
    ngxTranslateService = {
      get: sinon.stub().callsFake((arg) => of(arg)),
      instant: sinon.stub().returnsArg(0),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: NgxTranslateService, useValue: ngxTranslateService },
      ]
    });
    service = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {
    it('should get translated value', async () => {
      const expected = 'expected translation';
      const actual = await service.get(expected);

      expect(actual).to.equal(expected);
      expect(ngxTranslateService.get.callCount).to.equal(1);
      expect(ngxTranslateService.get.args[0]).to.deep.equal([expected, undefined]);
    });

    it('should pass interpolation params', async () => {
      const expected = 'expected translation';
      const params = { param: 'one', other: 'two' };
      const actual = await service.get(expected, params);

      expect(actual).to.equal(expected);
      expect(ngxTranslateService.get.callCount).to.equal(1);
      expect(ngxTranslateService.get.args[0]).to.deep.equal([expected, params]);
    });

    it('should validate the key', async () => {
      const empty = await service.get('');
      const notDefined = await service.get(undefined);

      expect(empty).to.equal('');
      expect(notDefined).to.equal(undefined);

      expect(ngxTranslateService.get.callCount).to.equal(0);
    });
  });

  describe('instant', () => {
    it('should get translated value', () => {
      const expected = 'expected translation';
      const actual = service.instant(expected);

      expect(actual).to.equal(expected);
      expect(ngxTranslateService.instant.callCount).to.equal(1);
      expect(ngxTranslateService.instant.args[0]).to.deep.equal([expected, undefined]);
    });

    it('should pass interpolation params', () => {
      const expected = 'expected translation';
      const params = { param: 'one', other: 'two' };
      const actual = service.instant(expected, params);

      expect(actual).to.equal(expected);
      expect(ngxTranslateService.instant.callCount).to.equal(1);
      expect(ngxTranslateService.instant.args[0]).to.deep.equal([expected, params]);
    });

    it('should validate the key', () => {
      const empty = service.instant('');
      const notDefined = service.instant(undefined);

      expect(empty).to.equal('');
      expect(notDefined).to.equal(undefined);

      expect(ngxTranslateService.instant.callCount).to.equal(0);
    });
  });

  describe('fieldIsRequired', () => {
    it('should translate field value correctly', async () => {
      const field = 'field value';
      const actual = await service.fieldIsRequired(field);

      expect(actual).to.equal('field is required');

      expect(ngxTranslateService.get.callCount).to.equal(2);
      expect(ngxTranslateService.get.args[0]).to.deep.equal([field, undefined]);
      expect(ngxTranslateService.get.args[1]).to.deep.equal(['field is required', { field }]);
    });
  });
});
