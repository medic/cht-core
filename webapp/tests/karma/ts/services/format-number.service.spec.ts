import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { LanguageService } from '@mm-services/language.service';
import { FormatNumberService } from '@mm-services/format-number.service';

describe('FormatNumberService', () => {
  let languageService;
  let service:FormatNumberService;

  beforeEach(() => {
    languageService = { useDevanagariScript: sinon.stub() };
    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageService, useValue: languageService },
      ]
    });

    service = TestBed.inject(FormatNumberService);
  });

  describe('localize', () => {
    it('should echo if not a number', () => {
      expect(service.localize(['something'])).to.deep.equal(['something']);
      expect(service.localize(undefined)).to.equal(undefined);
      expect(service.localize(false)).to.equal(false);
      expect(service.localize({ some: 'thing' })).to.deep.equal({ some: 'thing' });

      languageService.useDevanagariScript.returns(true);
      expect(service.localize(['something'])).to.deep.equal(['something']);
      expect(service.localize(undefined)).to.equal(undefined);
      expect(service.localize(false)).to.equal(false);
      expect(service.localize({ some: 'thing' })).to.deep.equal({ some: 'thing' });
    });

    it('should echo if not using devanagari script', () => {
      languageService.useDevanagariScript.returns(false);
      expect(service.localize(0)).to.equal(0);
      expect(service.localize('0')).to.equal('0');
      expect(service.localize(123)).to.equal(123);
      expect(service.localize('45.9')).to.equal('45.9');
      expect(service.localize(-100)).to.equal(-100);
      expect(service.localize('-1234')).to.equal('-1234');

      expect(service.localize('something')).to.equal('something');
    });

    it('should use devanagari script', () => {
      languageService.useDevanagariScript.returns(true);

      expect(service.localize(0)).to.equal('०');
      expect(service.localize('0')).to.equal('०');
      expect(service.localize(22)).to.equal('२२');
      expect(service.localize('22')).to.equal('२२');
      expect(service.localize(-50)).to.equal('-५०');
      expect(service.localize('-50')).to.equal('-५०');

      expect(service.localize('something')).to.equal('something');
    });
  });
});
