import {
  and,
  byContactType,
  byContactId,
  byContactIds,
  byFreetext,
  byReportingPeriod,
  byUsername,
  byUuid, FreetextQualifier,
  isContactTypeQualifier,
  isContactIdQualifier,
  isContactIdsQualifier,
  isFreetextQualifier,
  isKeyedFreetextQualifier,
  isReportingPeriodQualifier,
  isUsernameQualifier,
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

  describe('isKeyedFreetextQualifier', () => {
    [
      [ { freetext: 'key:value' }, true ],
      [ { freetext: 'key:value with spaces' }, true ],
      [ { freetext: 'value' }, false ],
      [ { freetext: 'value with spaces' }, false ]
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isKeyedFreetextQualifier(qualifier as FreetextQualifier)).to.equal(expected);
      });
    });
  });

  describe('byReportingPeriod', () => {
    it('builds a qualifier for searching by reporting period (YYYY-MM)', () => {
      expect(byReportingPeriod('2025-07')).to.deep.equal({ reportingPeriod: '2025-07' });
    });

    [
      null,
      '',
      { },
      '2025-13',
      '2025-00',
      '202-12',
      '2025-1',
      '2025-012'
    ].forEach(reportingPeriod => {
      it(`throws an error for ${JSON.stringify(reportingPeriod)}`, () => {
        expect(() => byReportingPeriod(reportingPeriod as string)).to.throw(
          `Invalid reporting period [${reportingPeriod as string}].`
        );
      });
    });
  });

  describe('isReportingPeriodQualifier', () => {
    [
      [ null, false ],
      [ '2025-07', false ],
      [ { reportingPeriod: '2025-07' }, true ],
      [ { reportingPeriod: '1999-12' }, true ],
      [ { reportingPeriod: '2025-13' }, false ],
      [ { reportingPeriod: '2025-1' }, false ],
      [ { reportingPeriod: { } }, false ]
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isReportingPeriodQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byUsername', () => {
    it('builds a qualifier for searching by username', () => {
      expect(byUsername('alice')).to.deep.equal({ username: 'alice' });
    });

    [
      null,
      ''
    ].forEach(username => {
      it(`throws an error for ${JSON.stringify(username)}`, () => {
        expect(() => byUsername(username!)).to.throw(
          `Invalid username [${username}].`
        );
      });
    });
  });

  describe('isUsernameQualifier', () => {
    [
      [ null, false ],
      [ 'alice', false ],
      [ { username: '' }, false ],
      [ { username: 'bob' }, true ],
      [ { username: { } }, false ]
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isUsernameQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byContactId', () => {
    it('builds a qualifier for searching by contact Id', () => {
      expect(byContactId('abc-123')).to.deep.equal({ contactId: 'abc-123' });
    });

    [
      null,
      ''
    ].forEach(contactId => {
      it(`throws an error for ${JSON.stringify(contactId)}`, () => {
        expect(() => byContactId(contactId!)).to.throw(
          `Invalid contact Id [${contactId}].`
        );
      });
    });
  });

  describe('isContactIdQualifier', () => {
    [
      [ null, false ],
      [ 'abc-123', false ],
      [ { contactId: '' }, false ],
      [ { contactId: 'def-456' }, true ],
      [ { contactId: { } }, false ]
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isContactIdQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byContactIds', () => {
    ([
      ['abc-123'],
      ['abc-123', 'abc-200']
    ] as [string, ...string[]][]).forEach((contactIds) => {
      it('builds a qualifier for searching by contact Id', () => {
        expect(byContactIds(contactIds)).to.deep.equal({ contactIds });
      });
    });

    ([
      null,
      '',
      [],
      [''],
    ] as [string, ...string[]][]).forEach(contactIds => {
      it(`throws an error for ${JSON.stringify(contactIds)}`, () => {
        expect(() => byContactIds(contactIds)).to.throw(
          `Invalid contact Ids [${contactIds}].`
        );
      });
    });
  });

  describe('isContactIdsQualifier', () => {
    [
      [ null, false ],
      [ 'abc-123', false ],
      [ { contactIds: '' }, false ],
      [ { contactIds: { } }, false ],
      [ { contactIds: [] }, false ],
      [ { contactIds: ['abc-123', ''] }, false ],
      [ { contactIds: [null, 'abc-123'] }, false ],
      [ { contactIds: ['abc-123'] }, true ],
      [ { contactIds: ['abc-123', 'abc-123', 'abc-123'] }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isContactIdsQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('and', () => {
    it('combines two qualifiers', () => {
      const combined = and(byUuid('u1'), byContactType('person'));
      expect(combined).to.deep.equal({ uuid: 'u1', contactType: 'person' });
    });

    it('combines up to four qualifiers', () => {
      const combined = and(
        byUuid('u1'),
        byContactType('person'),
        byFreetext('value'),
        byReportingPeriod('2025-07')
      );
      expect(combined).to.deep.equal({
        uuid: 'u1',
        contactType: 'person',
        freetext: 'value',
        reportingPeriod: '2025-07'
      });
    });

    it('last-in wins on overlapping keys', () => {
      const combined = and(byUuid('first'), byUuid('second'));
      expect(combined).to.deep.equal({ uuid: 'second' });
    });
  });
});
