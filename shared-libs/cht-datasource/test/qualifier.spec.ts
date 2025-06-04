import {
  byContactType,
  byFreetext,
  byUuid,
  isContactTypeQualifier,
  isFreetextQualifier,
  isUuidQualifier,
  byContactQualifier,
  isContactQualifier
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
    it('builds a qualifier for searching an entity by freetext with colon : delimiter', () => {
      expect(byFreetext('key:some value')).to.deep.equal({ freetext: 'key:some value' });
    });

    it('builds a qualifier for searching an entity by freetext without colon : delimiter', () => {
      expect(byFreetext('value')).to.deep.equal({ freetext: 'value' });
    });

    [
      null,
      '',
      { },
      'ab',
      ' '
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
      [ ' ', false ],
      [ 'freetext', false ],
      [ { freetext: 'freetext' }, true ],
      [ { freetext: 'freetext', other: 'other' }, true ],
      [ { freetext: 'key:some value' }, true ]
    ].forEach(([ freetext, expected ]) => {
      it(`evaluates ${JSON.stringify(freetext)}`, () => {
        expect(isFreetextQualifier(freetext)).to.equal(expected);
      });
    });
  });
  
  describe('byContactQualifier', () => {
    it('builds a qualifier for creation and update of a contact with the required fields.', () => {
      expect(byContactQualifier({
        name: 'A', type: 'person'
      })).to.deep.equal({
        name: 'A', type: 'person'
      });
    });
  
    it('builds a qualifier for creation and update of a contact with the optional reported_date field.', () => {
      expect(byContactQualifier({
        name: 'A', type: 'person', reported_date: '2025-06-03T12:45:30Z'
      })).to.deep.equal({
        name: 'A', type: 'person', reported_date: '2025-06-03T12:45:30Z'
      });
    });
  
    it('throws error for invalid reported_date field.', () => {
      expect(() => byContactQualifier({
        name: 'A', type: 'person', reported_date: '2025-06'
      // eslint-disable-next-line max-len
      })).to.throw(`Invalid reported_date. Expected format to be 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or a Unix epoch.`);
    });
  
    it('throws error for missing required fields.', () => {
      [
        {
          name: 'A'
        },
        {
          type: 'person', reported_date: '2025-06-03T12:45:30Z'
        }
      ].forEach((quantifier) => expect(() => byContactQualifier(quantifier))
        .to.throw(`Missing required fields [${JSON.stringify(quantifier)}].`));
      
    });
  });
  
  describe('isContactQualifier', () => {
    it('returns false for missing required fields.', () => {
      [
        {
          name: 'A'
        },
        {
          type: 'person', reported_date: '2025-06-03T12:45:30Z'
        }
      ].forEach((quantifier) => expect(isContactQualifier(quantifier)).to.be.false);
    });
  
    it('returns false for invalid reported_date format', () => {
      [
        {
          name: 'A', type: 'person', reported_date: '10-05-2024'
        },
        {
          name: 'A', type: 'person', reported_date: '2025'
        }
      ].forEach((quantifier) => expect(isContactQualifier(quantifier)).to.be.false);
    });
  
    it('returns true for valid contact qualifiers', () => {
      [
        {
          name: 'A', type: 'person', reported_date: 1748029550
        },
        {
          name: 'B', type: 'person', reported_date: '2025-06-03T12:45:30Z'
        },
        {
          name: 'B', type: 'person', reported_date: '2025-06-03T12:45:30.222Z', id: 'id-1',
          _rev: 'revision-3'
        }
      ].forEach((quantifier) => expect(isContactQualifier(quantifier)).to.be.true);
    });
  });
});
