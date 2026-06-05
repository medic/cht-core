import {
  and,
  byContactType,
  byContactId,
  byContactIds,
  byExternalRef,
  byExternalRefs,
  byFreetext,
  byPhone,
  byPhones,
  byReportingPeriod,
  byShortcode,
  byShortcodes,
  byUsername,
  byUuid, FreetextQualifier,
  isContactTypeQualifier,
  isContactIdQualifier,
  isContactIdsQualifier,
  isExternalRefQualifier,
  isExternalRefsQualifier,
  isFreetextQualifier,
  isKeyedFreetextQualifier,
  isPhoneQualifier,
  isPhonesQualifier,
  isReportingPeriodQualifier,
  isShortcodeQualifier,
  isShortcodesQualifier,
  isUsernameQualifier,
  isUuidQualifier,
  byId,
  isIdQualifier
} from '../src/qualifier';
import { expect } from 'chai';

describe('qualifier', () => {
  describe('byId', () => {
    it('builds a qualifier that identifies an entity by its id', () => {
      expect(byId('uuid')).to.deep.equal({ id: 'uuid' });
    });

    [
      null,
      '',
      { },
    ].forEach(uuid => {
      it(`throws an error for ${JSON.stringify(uuid)}`, () => {
        expect(() => byId(uuid as string)).to.throw(`Invalid id [${JSON.stringify(uuid)}].`);
      });
    });
  });

  describe('isIdQualifier', () => {
    [
      [ null, false ],
      [ 'uuid', false ],
      [ { id: { } }, false ],
      [ { id: 'uuid' }, true ],
      [ { id: 'uuid', other: 'other' }, true ]
    ].forEach(([ identifier, expected ]) => {
      it(`evaluates ${JSON.stringify(identifier)}`, () => {
        expect(isIdQualifier(identifier)).to.equal(expected);
      });
    });
  });

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

  describe('byPhone', () => {
    it('builds a qualifier for searching contacts by phone', () => {
      expect(byPhone('+15551234567')).to.deep.equal({ phone: '+15551234567' });
    });

    [
      null,
      '',
      { },
      123,
    ].forEach(phone => {
      it(`throws an error for ${JSON.stringify(phone)}`, () => {
        expect(() => byPhone(phone as string)).to.throw(`Invalid phone [${JSON.stringify(phone)}].`);
      });
    });
  });

  describe('isPhoneQualifier', () => {
    [
      [ null, false ],
      [ '+15551234567', false ],
      [ { phone: { } }, false ],
      [ { phone: '+15551234567' }, true ],
      [ { phone: '+15551234567', other: 'other' }, true ],
      [ { phone: '' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isPhoneQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byPhones', () => {
    it('builds a qualifier for the bulk lookup of contacts by phone', () => {
      expect(byPhones(['+1', '+2', '+3'])).to.deep.equal({ phones: ['+1', '+2', '+3'] });
    });

    ([
      null,
      undefined,
      'not-an-array',
      [],
      [''],
      ['valid', ''],
      ['valid', null],
      ['valid', 123],
    ] as unknown as [string, ...string[]][]).forEach(phones => {
      it(`throws an error for ${JSON.stringify(phones)}`, () => {
        expect(() => byPhones(phones)).to.throw(`Invalid phones [${JSON.stringify(phones)}].`);
      });
    });
  });

  describe('isPhonesQualifier', () => {
    [
      [ null, false ],
      [ ['+1'], false ],                          // bare array, not a qualifier
      [ { phones: '+1' }, false ],                // string not array
      [ { phones: [] }, false ],                  // empty array
      [ { phones: ['+1', ''] }, false ],          // empty element
      [ { phones: ['+1', null] }, false ],        // non-string element
      [ { phones: ['+1'] }, true ],
      [ { phones: ['+1', '+2', '+3'] }, true ],
      [ { phones: ['+1'], other: 'other' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isPhonesQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byShortcode', () => {
    it('builds a qualifier for searching contacts by shortcode', () => {
      expect(byShortcode('12345')).to.deep.equal({ shortcode: '12345' });
    });

    [
      null,
      '',
      { },
      123,
    ].forEach(shortcode => {
      it(`throws an error for ${JSON.stringify(shortcode)}`, () => {
        expect(() => byShortcode(shortcode as string)).to.throw(`Invalid shortcode [${JSON.stringify(shortcode)}].`);
      });
    });
  });

  describe('isShortcodeQualifier', () => {
    [
      [ null, false ],
      [ '12345', false ],
      [ { shortcode: { } }, false ],
      [ { shortcode: '12345' }, true ],
      [ { shortcode: '12345', other: 'other' }, true ],
      [ { shortcode: '' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isShortcodeQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byShortcodes', () => {
    it('builds a qualifier for the bulk lookup of contacts by shortcode', () => {
      expect(byShortcodes(['1', '2', '3'])).to.deep.equal({ shortcodes: ['1', '2', '3'] });
    });

    ([
      null,
      undefined,
      'not-an-array',
      [],
      [''],
      ['valid', ''],
      ['valid', null],
      ['valid', 123],
    ] as unknown as [string, ...string[]][]).forEach(shortcodes => {
      it(`throws an error for ${JSON.stringify(shortcodes)}`, () => {
        expect(() => byShortcodes(shortcodes)).to.throw(`Invalid shortcodes [${JSON.stringify(shortcodes)}].`);
      });
    });
  });

  describe('isShortcodesQualifier', () => {
    [
      [ null, false ],
      [ ['1'], false ],                           // bare array, not a qualifier
      [ { shortcodes: '1' }, false ],             // string not array
      [ { shortcodes: [] }, false ],              // empty array
      [ { shortcodes: ['1', ''] }, false ],       // empty element
      [ { shortcodes: ['1', null] }, false ],     // non-string element
      [ { shortcodes: ['1'] }, true ],
      [ { shortcodes: ['1', '2', '3'] }, true ],
      [ { shortcodes: ['1'], other: 'other' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isShortcodesQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byExternalRef', () => {
    it('builds a qualifier for searching contacts by external ref', () => {
      expect(byExternalRef('rc-1')).to.deep.equal({ externalRef: 'RC-1' });
    });

    it('upper-cases the external ref to match the underlying view', () => {
      expect(byExternalRef('abc')).to.deep.equal({ externalRef: 'ABC' });
    });

    [
      null,
      '',
      { },
      123,
    ].forEach(ref => {
      it(`throws an error for ${JSON.stringify(ref)}`, () => {
        expect(() => byExternalRef(ref as string)).to.throw(`Invalid external ref [${JSON.stringify(ref)}].`);
      });
    });
  });

  describe('isExternalRefQualifier', () => {
    [
      [ null, false ],
      [ 'rc-1', false ],
      [ { externalRef: { } }, false ],
      [ { externalRef: 'RC-1' }, true ],
      [ { externalRef: 'RC-1', other: 'other' }, true ],
      [ { externalRef: '' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isExternalRefQualifier(qualifier)).to.equal(expected);
      });
    });
  });

  describe('byExternalRefs', () => {
    it('builds a qualifier for the bulk lookup of contacts by external ref', () => {
      expect(byExternalRefs(['rc-1', 'rc-2'])).to.deep.equal({ externalRefs: ['RC-1', 'RC-2'] });
    });

    it('upper-cases every external ref', () => {
      expect(byExternalRefs(['a', 'b', 'c'])).to.deep.equal({ externalRefs: ['A', 'B', 'C'] });
    });

    ([
      null,
      undefined,
      'not-an-array',
      [],
      [''],
      ['valid', ''],
      ['valid', null],
      ['valid', 123],
    ] as unknown as [string, ...string[]][]).forEach(externalRefs => {
      it(`throws an error for ${JSON.stringify(externalRefs)}`, () => {
        expect(() => byExternalRefs(externalRefs)).to.throw(`Invalid external refs [${JSON.stringify(externalRefs)}].`);
      });
    });
  });

  describe('isExternalRefsQualifier', () => {
    [
      [ null, false ],
      [ ['RC-1'], false ],                          // bare array, not a qualifier
      [ { externalRefs: 'RC-1' }, false ],          // string not array
      [ { externalRefs: [] }, false ],              // empty array
      [ { externalRefs: ['RC-1', ''] }, false ],    // empty element
      [ { externalRefs: ['RC-1', null] }, false ],  // non-string element
      [ { externalRefs: ['RC-1'] }, true ],
      [ { externalRefs: ['RC-1', 'RC-2'] }, true ],
      [ { externalRefs: ['RC-1'], other: 'other' }, true ],
    ].forEach(([ qualifier, expected ]) => {
      it(`evaluates ${JSON.stringify(qualifier)}`, () => {
        expect(isExternalRefsQualifier(qualifier)).to.equal(expected);
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
