const lib = require('../src/translation-utils');
const sinon = require("sinon");
const chai = require("chai");
const expect = require('chai').expect;

describe('Translation Utils Lib', () => {
  'use strict';

  it('should not crash when getting invalid parameter', () => {
    expect(lib.loadTranslations()).to.deep.equal({});
    expect(lib.loadTranslations(null)).to.deep.equal({});
    expect(lib.loadTranslations('a string')).to.deep.equal({});
    expect(lib.loadTranslations('true')).to.deep.equal({});
  });

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

  it('deals with keys with number values', () => {
    const translations = {
      'one': 1,
      'two': '${one} two'
    };
    const expected = {
      'one': 1,
      'two': '1 two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with boolean values', () => {
    const translations = {
      'one': true,
      'two': '${one} two'
    };
    const expected = {
      'one': true,
      'two': '${one} two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with null values', () => {
    const translations = {
      'one': null,
      'two': '${one} two'
    };
    const expected = {
      'one': null,
      'two': '${one} two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with undefined values', () => {
    const translations = {
      'one': undefined,
      'two': '${one} two'
    };
    const expected = {
      'one': undefined,
      'two': '${one} two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with object values', () => {
    const translations = {
      'one': {},
      'two': '${one} two'
    };
    const expected = {
      'one': {},
      'two': '${one} two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  it('deals with keys with symbol values', () => {
    const symb = Symbol();
    const translations = {
      'one': symb,
      'two': '${one} two'
    };
    const expected = {
      'one': symb,
      'two': '${one} two'
    };
    expect(lib.loadTranslations(translations)).to.deep.equal(expected);
  });

  describe('getTranslationDocs', () => {
    it('should return all translation docs', () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: 'messages-en', type: 'translations', code: 'en', generic: {} } },
          { doc: { _id: 'messages-fr', type: 'translations', code: 'en', values: {} } },
        ],
      });
      return lib.getTranslationDocs().then(results => {
        chai.expect(results).to.deep.equal([
          { _id: 'messages-en', type: 'translations', code: 'en', generic: {} },
          { _id: 'messages-fr', type: 'translations', code: 'en', values: {} },
        ]);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([
          { startkey: 'messages-', endkey: `messages-\ufff0`, include_docs: true }
        ]);
      });
    });

    it('should exclude invalid docs', () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: 'messages-en', type: 'not-translations', code: 'en', generic: {} } },
          { doc: { _id: 'messages-fr', type: 'translations', values: {} } },
          { doc: { _id: 'messages-fr____rev____tombstone', type: 'tombstone', values: {} } },
          { doc: { _id: 'messages-de', type: 'translations', code: 'en' }, },
          { doc: { _id: 'messages-es', type: 'translations', code: 'es', generic: {} } },
        ],
      });
      return lib.getTranslationDocs().then(results => {
        chai.expect(results).to.deep.equal([
          { _id: 'messages-es', type: 'translations', code: 'es', generic: {} },
        ]);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([
          { startkey: 'messages-', endkey: `messages-\ufff0`, include_docs: true }
        ]);
      });
    });
  });

});
