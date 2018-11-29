var lib = require('../src/translation-utils'),
    expect = require('chai').expect;

describe('Translation Utils Lib', () => {
  'use strict';

  it('resolves nested ids', () => {
    const translations = {
      'one': 'first',
      'two': 'second',
      'three': '${one} third ${two}'
    };
    const expected = {
      'one': 'first',
      'two': 'second',
      'three': 'first third second'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with missing id', () => {
    const translations = {
      'one': 'first',
      'three': '${one} third ${two}'
    };
    const expected = {
      'one': 'first',
      'three': 'first third ${two}'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with spaces', () => {
    const translations = {
      'one two': 'first',
      'three': '${one two} third'
    };
    const expected = {
      'one two': 'first',
      'three': 'first third'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

});
