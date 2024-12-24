import {
  byContactType,
  byFreetext,
  byUuid,
  isContactTypeQualifier,
  isFreetextQualifier,
  isUuidQualifier
} from '../src/qualifier';
import { expect } from 'chai';

describe('qualifier', () => {
  describe('byUuid', () => {
    it('builds a qualifier that identifies an entity by its UUID', () => {
      expect(byUuid('uuid')).to.deep.equal({ uuid: 'uuid' });
    });

    [
      null,
      '',
      { },
    ].forEach(uuid => {
      it(`throws an error for ${JSON.stringify(uuid)}`, () => {
        expect(() => byUuid(uuid as string)).to.throw(`Invalid UUID [${JSON.stringify(uuid)}].`);
      });
    });
  });

  describe('isUuidQualifier', () => {
    [
      [ null, false ],
      [ 'uuid', false ],
      [ { uuid: { } }, false ],
      [ { uuid: 'uuid' }, true ],
      [ { uuid: 'uuid', other: 'other' }, true ]
    ].forEach(([ identifier, expected ]) => {
      it(`evaluates ${JSON.stringify(identifier)}`, () => {
        expect(isUuidQualifier(identifier)).to.equal(expected);
      });
    });
  });

  describe('byContactType', () => {
    it('builds a qualifier that identifies an entity by its contactType', () => {
      expect(byContactType('person')).to.deep.equal({ contactType: 'person' });
    });

    [
      null,
      '',
      { },
    ].forEach(contactType => {
      it(`throws an error for ${JSON.stringify(contactType)}`, () => {
        expect(() => byContactType(contactType as string)).to.throw(
          `Invalid contact type [${JSON.stringify(contactType)}].`
        );
      });
    });
  });

  describe('isContactTypeQualifier', () => {
    [
      [ null, false ],
      [ 'person', false ],
      [ { contactType: { } }, false ],
      [ { contactType: 'person' }, true ],
      [ { contactType: 'person', other: 'other' }, true ]
    ].forEach(([ contactType, expected ]) => {
      it(`evaluates ${JSON.stringify(contactType)}`, () => {
        expect(isContactTypeQualifier(contactType)).to.equal(expected);
      });
    });
  });

  describe('byFreetext', () => {
    it('builds a qualifier for searching an entity by freetext', () => {
      expect(byFreetext('freetext')).to.deep.equal({ freetext: 'freetext' });
    });

    [
      null,
      '',
      { },
    ].forEach(freetext => {
      it(`throws an error for ${JSON.stringify(freetext)}`, () => {
        expect(() => byFreetext(freetext as string)).to.throw(
          `Invalid freetext [${JSON.stringify(freetext)}].`
        );
      });
    });
  });

  describe('isFreetextQualifier', () => {
    [
      [ null, false ],
      [ 'freetext', false ],
      [ { freetext: 'freetext' }, true ],
      [ { freetext: 'freetext', other: 'other' }, true ]
    ].forEach(([ freetext, expected ]) => {
      it(`evaluates ${JSON.stringify(freetext)}`, () => {
        expect(isFreetextQualifier(freetext)).to.equal(expected);
      });
    });
  });
});
