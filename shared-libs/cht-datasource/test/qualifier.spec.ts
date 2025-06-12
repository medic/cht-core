import {
  byContactType,
  byFreetext,
  byUuid,
  isContactTypeQualifier,
  isFreetextQualifier,
  isUuidQualifier,
  byContactQualifier,
  isContactQualifier,
  byReportQualifier,
  isReportQualifier,
  byPersonQualifier
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
  
    it('throws error for missing or empty required fields.', () => {
      [
        {
          name: 'A'
        },
        {
          name: '', type: 'person'
        },
        {
          type: 'person', reported_date: '2025-06-03T12:45:30Z'
        }
      ].forEach((qualifier) => expect(() => byContactQualifier(qualifier))
        .to.throw(`Missing or empty required fields [${JSON.stringify(qualifier)}].`));
      
    });
  });
  
  describe('isContactQualifier', () => {
    it('returns false for missing or empty required fields.', () => {
      [
        {
          name: 'A'
        },
        {
          name: 'A', type: ''
        },
        {
          type: 'person', reported_date: '2025-06-03T12:45:30Z'
        }
      ].forEach((qualifier) => expect(isContactQualifier(qualifier)).to.be.false);
    });
  
    it('returns false for invalid reported_date format', () => {
      [
        {
          name: 'A', type: 'person', reported_date: '10-05-2024'
        },
        {
          name: 'A', type: 'person', reported_date: '2025'
        }
      ].forEach((qualifier) => expect(isContactQualifier(qualifier)).to.be.false);
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
      ].forEach((qualifier) => expect(isContactQualifier(qualifier)).to.be.true);
    });
  });

  describe('byReportQualifier', () => {
    it('builds a qualifier for creation and update of a report with the required fields.', () => {
      expect(byReportQualifier({
        type: 'data_record', form: 'yes'
      })).to.deep.equal({
        type: 'data_record', form: 'yes'
      });
    });

    it('builds a qualifier for creation and update of a report with the optional fields.', () => {
      expect(byReportQualifier({
        type: 'data_record', form: 'yes', _id: 'id-1', _rev: 'rev-3', reported_date: '2025-06-03T12:45:30.222Z'
      })).to.deep.equal({
        type: 'data_record', form: 'yes', _id: 'id-1', _rev: 'rev-3', reported_date: '2025-06-03T12:45:30.222Z'
      });
    });

    it('throws error for invalid reported_date.', () => {
      expect(() => byReportQualifier({
        type: 'data_record', form: 'yes', reported_date: '2025'
      // eslint-disable-next-line max-len
      })).to.throw('Invalid reported_date. Expected format to be \'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.');
    });

    it('throws error if qualifier is not an object.', () => {
      [
        'hello world',
        2124124,
        false
      ].forEach((qualifier) => expect(() => byReportQualifier(qualifier))
        .to.throw('Invalid "data": expected an object.'));
    });

    it('throws error if type/form is not provided or empty.', () => {
      [
        {reported_date: 3432433},
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4'},
        {form: 'yes', _id: 'id-1', _rev: 'rev-4'},
        {type: '', form: 'yes'},
        {type: 'data_record', form: ''}
      ].forEach((qualifier) => {
        expect(() => byReportQualifier(qualifier))
          .to.throw(`Missing or empty required fields [${JSON.stringify(qualifier)}].`);
      });
    });
  });

  describe('isReportQualifier', () => {
    it('returns false for missing or empty required fields', () => {
      [
        {reported_date: 3432433},
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4'},
        {form: 'yes', _id: 'id-1', _rev: 'rev-4'},
        {type: '', form: 'yes'},
        {type: 'data_record', form: ''}
      ].forEach((qualifier) => {
        expect(isReportQualifier(qualifier)).to.be.false;
      });
    });

    it('returns true for valid qualifiers that have required fields and correct date format', () => {
      [
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4', form: 'yes', reported_date: 3432433},
        {type: 'data_record', form: 'yes', _id: 'id-1', reported_date: '2025-06-03T12:45:30.222Z'},
        {type: 'data_record', form: 'yes'}
      ].forEach((qualifier) => {
        expect(isReportQualifier(qualifier)).to.be.true;
      });
    });
  });

  describe('byPersonQualifier', () => {
    it('throws an error on missing parent object', () => {
      const data = {
        name: 'Antony',
        type: 'person',
      };
      expect(() => byPersonQualifier(data)).to.throw(`Missing or empty required fields [${JSON.stringify(data)}].`);
    });

    it('throws an error parent lineage missing `_id` or `parent` fields', () => {
      const data = {
        name: 'Antony',
        type: 'person',
        parent: {
          _id: '1-id',
          parent: {
            parent: {
              _id: '3-id'
            }
          }
        }
      };
      expect(() => byPersonQualifier(data)).to
        .throw(`Missing required fields in the parent hierarchy [${JSON.stringify(data)}].`);
    });

    it('throws an error on invalid contact types', () => {
      [
        {
          name: 'Antony',
          type: 'contact',
          parent: {
            _id: '1-id'
          }
        },
        {
          name: 'Antony',
          type: 'astronaut',
          parent: {
            _id: '1-id'
          }
        }
      ].forEach((qualifier) => {
        expect(() => byPersonQualifier(qualifier)).to.throw(`Invalid type for contacts.`);
      });
    });

    it('throws an error on bloated parent hierarchy', () => {
      const data = {
        name: 'Antony',
        type: 'person',
        parent: {
          _id: '1-id',
          parent: {
            _id: '2-id',
            parent: {
              _id: '3-id',
              name: 'Hydrated User',
              type: 'person',
              parent: {
                _id: '4-id'
              }
            }
          }
        }
      };
      expect(() => byPersonQualifier(data)).to
        .throw(`Additional fields found in the parent lineage [${JSON.stringify(data)}].`);
    });

    it('builds qualifier for valid objects', () => {
      [
        {
          name: 'user-1',
          type: 'person',
          parent: {
            _id: '1-id',
            parent: {
              _id: '2-id'
            }
          }
        },
        {
          name: 'user-2',
          type: 'contact',
          contact_type: 'clinic_worker',
          parent: {
            _id: '1-id'
          }
        }
      ].forEach((qualifier) => expect(byPersonQualifier(qualifier)).to.deep.equal(qualifier));
    });

  });
});
