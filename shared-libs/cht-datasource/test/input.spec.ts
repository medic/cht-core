import { isContactInput, isPersonInput, isPlaceInput, isReportInput, 
  validateContactInput, validatePersonInput, validatePlaceInput, validateReportInput 
} from '../src/input';
import { expect } from 'chai';
import sinon from 'sinon';

describe('input', () => {
  let clock: sinon.SinonFakeTimers;
  const CURRENT_ISO_TIMESTAMP = '2023-01-01T00:01:23.000Z';
  before(() => {
    const fakeNow = new Date(CURRENT_ISO_TIMESTAMP).getTime();
    clock = sinon.useFakeTimers(fakeNow);
  });

  after(() => {
    clock.restore();
  });
  describe('validateContactInput', () => {
    it('builds a input for creation and update of a contact with the required fields.', () => {
      expect(validateContactInput({
        name: 'A', type: 'person'
      })).to.deep.equal({
        name: 'A', type: 'person', reported_date: CURRENT_ISO_TIMESTAMP
      });
    });
  
    it('builds a input for creation and update of a contact with the optional reported_date field.', () => {
      expect(validateContactInput({
        name: 'A', type: 'person', reported_date: '2025-06-03T12:45:30Z'
      })).to.deep.equal({
        name: 'A', type: 'person', reported_date: '2025-06-03T12:45:30Z'
      });
    });
  
    it('throws error for invalid reported_date field.', () => {
      expect(() => validateContactInput({
        name: 'A', type: 'person', reported_date: '2025-06'
      })).to.throw('Invalid reported_date. Expected format to be ' +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.');
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
      ].forEach((input) => expect(() => validateContactInput(input))
        .to.throw(`Missing or empty required fields (name, type) for [${JSON.stringify(input)}].`));
      
    });

    it('throws error for invalid data object type.', () => {
      const input = 'my contact input';
      expect(() => validateContactInput(input))
        .to.throw('Invalid "data": expected an object.');
    });
  });
  
  describe('isContactInput', () => {
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
      ].forEach((input) => expect(isContactInput(input)).to.be.false);
    });
  
    it('returns false for invalid reported_date format', () => {
      [
        {
          name: 'A', type: 'person', reported_date: '10-05-2024'
        },
        {
          name: 'A', type: 'person', reported_date: '2025'
        }
      ].forEach((input) => expect(isContactInput(input)).to.be.false);
    });
  
    it('returns true for valid contact inputs', () => {
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
      ].forEach((input) => expect(isContactInput(input)).to.be.true);
    });
  });

  describe('validateReportInput', () => {
    it('builds a input for creation and update of a report with the required fields.', () => {
      expect(validateReportInput({
        type: 'data_record', form: 'yes', contact: 'c1'
      })).to.deep.equal({
        type: 'data_record', form: 'yes', reported_date: CURRENT_ISO_TIMESTAMP, contact: 'c1'
      });
    });

    it('builds a input for creation and update of a report with the optional fields.', () => {
      expect(validateReportInput({
        type: 'data_record', form: 'yes', _id: 'id-1', _rev: 'rev-3', reported_date: '2025-06-03T12:45:30.222Z', 
        contact: 'c2'
      })).to.deep.equal({
        type: 'data_record', form: 'yes', _id: 'id-1', _rev: 'rev-3', 
        contact: 'c2', reported_date: '2025-06-03T12:45:30.222Z'
      });
    });

    it('throws error for invalid reported_date.', () => {
      expect(() => validateReportInput({
        type: 'data_record',
        form: 'yes',
        reported_date: '2025',
      })).to.throw(
        'Invalid reported_date. Expected format to be \'YYYY-MM-DDTHH:mm:ssZ\', ' +
          '\'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
      );
    });
    

    it('throws error if input is not an object.', () => {
      [
        'hello world',
        2124124,
        false
      ].forEach((input) => expect(() => validateReportInput(input))
        .to.throw('Invalid "data": expected an object.'));
    });

    it('throws error if type/form is not provided or empty.', () => {
      [
        {reported_date: 3432433, contact: 'c1'},
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4', contact: 'c1', reported_date: CURRENT_ISO_TIMESTAMP},
        {form: 'yes', _id: 'id-1', _rev: 'rev-4', contact: 'c1'},
        {type: '', form: 'yes', contact: 'c1'},
        {type: 'data_record', form: '', contact: 'c1'}
      ].forEach((input) => {
        expect(() => validateReportInput(input))
          .to.throw(`Missing or empty required fields (type, form) in [${JSON.stringify(input)}].`);
      });
    });

    it('throws error if contact is not provided or empty.', () => {
      [
        {type: 'data_record', form: 'yes'},
        {type: 'data_record', form: 'myform', contact: ''}
      ].forEach((input) => {
        expect(() => validateReportInput(input))
          .to.throw(`Missing or empty required field (contact) in [${JSON.stringify(input)}].`);
      });
    });
  });

  describe('isReportInput', () => {
    it('returns false for missing or empty or invalid required fields', () => {
      [
        {reported_date: 3432433},
        {type: 'data_record', form: 'yes', contact: 'c1', reported_date: 'Thursday'},
        {type: 'data_record', form: 'yes', contact: 'c1', reported_date: {day: '1', month: '12'}},
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4'},
        {form: 'yes', _id: 'id-1', _rev: 'rev-4'},
        {type: '', form: 'yes'},
        {type: 'data_record', form: ''}
      ].forEach((input) => {
        expect(isReportInput(input)).to.be.false;
      });
    });

    it('returns true for valid inputs that have required fields and correct date format', () => {
      [
        {type: 'data_record', contact: 'c1', _id: 'id-1', _rev: 'rev-4', form: 'yes', reported_date: 3432433},
        {type: 'data_record', contact: 'c1', form: 'yes', _id: 'id-1', reported_date: '2025-06-03T12:45:30.222Z'},
        {type: 'data_record', contact: 'c1', form: 'yes'}
      ].forEach((input) => {
        expect(isReportInput(input)).to.be.true;
      });
    });

    it('returns false for invalid reported_date format', () => {
      const input = {
        type: 'data_record', 
        _id: 'id-1', _rev: 'rev-4', 
        form: 'yes',
        reported_date: '2020-05-12'
      };
      expect(isReportInput(input)).to.be.false;
    });
    
    it('returns false for invalid reported_date type', () => {
      const input = {
        type: 'data_record', 
        _id: 'id-1', _rev: 'rev-4', 
        form: 'yes',
        reported_date: {
          day: '12',
          month: '2',
          year: '2014'
        }
      };
      expect(isReportInput(input)).to.be.false;
    });
  });

  describe('validatePersonInput', () => {
    it('throws an error on missing parent string', () => {
      const data = {
        name: 'Antony',
        type: 'person',
      };

      const expected_data = {
        ...data, reported_date: CURRENT_ISO_TIMESTAMP
      };

      expect(() => validatePersonInput(data)).to
        .throw(`Missing or empty required field (parent) [${JSON.stringify(expected_data)}].`);
    });

    it('throws an error if parent is an empty string', () => {
      const data = {
        name: 'Antony',
        type: 'person',
        parent: ''
      };

      const expected_data = {
        ...data, reported_date: CURRENT_ISO_TIMESTAMP
      };

      expect(() => validatePersonInput(data)).to
        .throw(`Missing or empty required field (parent) [${JSON.stringify(expected_data)}].`);
    });

    it('builds input for valid objects', () => {
      [
        {
          name: 'user-1',
          type: 'person',
          parent: 'p-1'
        },
        {
          name: 'user-2',
          type: 'clinic_worker',
          parent: 'p-1'
        },
        {
          name: 'user-3',
          reported_date: 323232,
          type: 'clinic_worker',
          parent: 'p-1'
        }
      ].forEach((input) => {
        const expected_input = {reported_date: CURRENT_ISO_TIMESTAMP, ...input};
        expect(validatePersonInput(input))
          .to.deep.equal({...expected_input});
      });

    });
  });

  describe('isPersonInput', () => {
    it('returns false for missing required fields(type,name)', () => {
      const data = {
        name: 'user-1',
        parent: 'p-1'
      }; 
      expect(isPersonInput(data)).to.be.false; 
    });

    it('returns false on missing parent object', () => {
      const data = {
        name: 'Antony',
        type: 'person',
      };
      expect(isPersonInput(data)).to.be.false;
    });

    it('returns true for valid PersonInput objects', () => {
      [
        {
          name: 'user-1',
          type: 'person',
          parent: 'p-1'
        },
        {
          name: 'user-2',
          type: 'clinic_worker',
          parent: 'p-1'
        }
      ].forEach((input) => expect(isPersonInput(input)).to.be.true);
    });

  });

  describe('validatePlaceInput', () => {
    it('throws error for empty parent', () => {
      const input = {
        type: 'place',
        name: 'place-1',
        parent: ''
      };
      
      const expected_input = { ...input, reported_date: CURRENT_ISO_TIMESTAMP };
      expect(() => validatePlaceInput(input))
        .to.throw(`Missing or empty required field (parent) for [${JSON.stringify(expected_input)}].`);
    });

    it('throws error for empty contact', () => {
      const input = {
        type: 'place',
        name: 'place-1',
        contact: ''
      };
      
      const expected_input = { ...input, reported_date: CURRENT_ISO_TIMESTAMP };
      expect(() => validatePlaceInput(input))
        .to.throw(`Missing or empty required field (contact) for [${JSON.stringify(expected_input)}].`);
    });

    it('throws error for missing required fields', () => {
      [
        {
          name: 'place-1',
          parent: 'p1',
          contact: 'c1'
        },
        {
          type: 'place',
          contact: 'p1'
        }
      ].forEach((input) => {
        expect(() => validatePlaceInput(input))
          .to.throw(`Missing or empty required fields (name, type) for [${JSON.stringify(input)}].`);
      });
    });

    it('throws error invalid reported date formats', () => {
      const input = {
        name: 'place-1',
        type: 'place',
        reported_date: '2025-10'
      };
      expect(() => validatePlaceInput(input))
        .to.throw('Invalid reported_date. Expected format to be ' +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.');
    });

    it('builds a input to create and update place for valid data', () => {
      [
        {
          name: 'place-1',
          type: 'hospital'
        }, {
          name: 'place-1',
          type: 'place',
          parent: 'p1'
        }, {
          name: 'place-1',
          type: 'place',
          reported_date: 21231231, 
        }, {
          name: 'place-1',
          type: 'place',
          contact: 'c1',
          parent: 'p1'
        }
      ].forEach((input) => {
        const expected_input = {reported_date: CURRENT_ISO_TIMESTAMP, ...input };
        expect(validatePlaceInput(input)).to.deep.equal(expected_input);
      });
    });
  });

  describe('isPlaceInput', () => {
    it('returns false for missing required fields', () => {
      [
        {
          name: 'place-1',
          parent: 'p1',
          contact: 'c1'
        },
        {
          type: 'place',
          contact: 'c1'
        }
      ].forEach((input) => {
        expect(isPlaceInput(input)).to.be.false;
      });
    });

    it('returns false for empty parent/contact fields', () => {
      [
        {
          name: 'place-1',
          type: 'place',
          contact: ''
        },
        {
          name: 'place-1',
          type: 'place',
          parent: ''
        }
      ].forEach((input) => {
        expect(isPlaceInput(input)).to.be.false;
      });
    });

    it('returns false invalid reported date formats', () => {
      const input = {
        name: 'place-1',
        type: 'place',
        reported_date: '2025-10'
      };
      expect(isPlaceInput(input)).to.be.false;
    });

    it('returns true for valid data', () => {
      [
        {
          name: 'place-1',
          type: 'place'
        }, {
          name: 'place-1',
          type: 'contact',
        }, {
          name: 'place-1',
          type: 'place',
        }, {
          name: 'place-1',
          type: 'place',
          reported_date: 21231231, 
          contact: 'c1'
        }, {
          name: 'place-1',
          type: 'place',
          contact: 'c1',
          parent: 'p1'
        }
      ].forEach((input) => {
        expect(isPlaceInput(input)).to.be.true;
      });
    });
  });
});
