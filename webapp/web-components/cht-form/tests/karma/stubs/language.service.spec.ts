import { expect } from 'chai';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../src/stubs/language.service';

describe('Language Service', () => {
  let service: LanguageService;

  beforeEach(() => service = TestBed.inject(LanguageService));

  it('setRtlLanguage', () => {
    expect(() => service.setRtlLanguage('')).to.not.throw();
  });
});
