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
  byPersonQualifier,
  isPersonQualifier,
  byPlaceQualifier,
  isPlaceQualifier,
} from '../src/qualifier';
import { expect } from 'chai';
import sinon from 'sinon';

describe('qualifier', () => {
  let clock: sinon.SinonFakeTimers;
  const CURRENT_ISO_TIMESTAMP = '2023-01-01T00:01:23.000Z';
  before(() => {
    const fakeNow = new Date(CURRENT_ISO_TIMESTAMP).getTime();
    clock = sinon.useFakeTimers(fakeNow);
  });

  after(() => {
    clock.restore();
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
  
  describe('byContactQualifier', () => {
    it('builds a qualifier for creation and update of a contact with the required fields.', () => {
      expect(byContactQualifier({
        name: 'A', type: 'person'
      })).to.deep.equal({
        name: 'A', type: 'person', reported_date: CURRENT_ISO_TIMESTAMP
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
      ].forEach((qualifier) => expect(() => byContactQualifier(qualifier))
        .to.throw(`Missing or empty required fields (name, type) for [${JSON.stringify(qualifier)}].`));
      
    });

    it('throws error for invalid data object type.', () => {
      const qualifier = 'my contact qualifier';
      expect(() => byContactQualifier(qualifier))
        .to.throw('Invalid "data": expected an object.');
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
        type: 'data_record', form: 'yes', reported_date: CURRENT_ISO_TIMESTAMP
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
        type: 'data_record',
        form: 'yes',
        reported_date: '2025',
      })).to.throw(
        'Invalid reported_date. Expected format to be \'YYYY-MM-DDTHH:mm:ssZ\', ' +
          '\'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
      );
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
        {type: 'data_record', _id: 'id-1', _rev: 'rev-4', reported_date: CURRENT_ISO_TIMESTAMP},
        {form: 'yes', _id: 'id-1', _rev: 'rev-4'},
        {type: '', form: 'yes'},
        {type: 'data_record', form: ''}
      ].forEach((qualifier) => {
        expect(() => byReportQualifier(qualifier))
          .to.throw(`Missing or empty required fields (type, form) in [${JSON.stringify(qualifier)}].`);
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

    it('returns false for invalid reported_date format', () => {
      const qualifier = {
        type: 'data_record', 
        _id: 'id-1', _rev: 'rev-4', 
        form: 'yes',
        reported_date: '2020-05-12'
      };
      expect(isReportQualifier(qualifier)).to.be.false;
    });
    
    it('returns false for invalid reported_date type', () => {
      const qualifier = {
        type: 'data_record', 
        _id: 'id-1', _rev: 'rev-4', 
        form: 'yes',
        reported_date: {
          day: '12',
          month: '2',
          year: '2014'
        }
      };
      expect(isReportQualifier(qualifier)).to.be.false;
    });
  });

  describe('byPersonQualifier', () => {
    it('throws an error on missing parent object', () => {
      const data = {
        name: 'Antony',
        type: 'person',
      };

      const expected_data = {
        ...data, reported_date: CURRENT_ISO_TIMESTAMP
      };

      expect(() => byPersonQualifier(data)).to
        .throw(`Missing or empty required field (parent) [${JSON.stringify(expected_data)}].`);
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

      const expected_data = {
        ...data, reported_date: CURRENT_ISO_TIMESTAMP
      };

      expect(() => byPersonQualifier(data)).to
        .throw(`Missing required fields (parent, _id) in the parent hierarchy [${JSON.stringify(expected_data)}].`);
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
        reported_date: 9402942,
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
        },
        {
          name: 'user-3',
          type: 'contact',
          reported_date: 323232,
          contact_type: 'clinic_worker',
          parent: {
            _id: '1-id'
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = {reported_date: CURRENT_ISO_TIMESTAMP, ...qualifier};
        expect(byPersonQualifier(qualifier))
          .to.deep.equal({...expected_qualifier});
      });

    });
  });

  describe('isPersonQualifier', () => {
    it('returns false for missing required fields(type,name)', () => {
      const data = {
        name: 'user-1',
        parent: {
          _id: '2'
        }
      }; 
      expect(isPersonQualifier(data)).to.be.false; 
    });

    it('returns false on missing parent object', () => {
      const data = {
        name: 'Antony',
        type: 'person',
      };
      expect(isPersonQualifier(data)).to.be.false;
    });

    it('returns false when parent lineage is missing `_id` or `parent` required fields', () => {
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
      expect(isPersonQualifier(data)).to.be.false;
    });

    it('returns false for invalid contact types', () => {
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
        expect(isPersonQualifier(qualifier)).to.be.false;
      });
    });

    it('returns false on finding bloated parent hierarchy', () => {
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
      expect(isPersonQualifier(data)).to.be.false;
    });

    it('returns true for valid PersonQualifier objects', () => {
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
      ].forEach((qualifier) => expect(isPersonQualifier(qualifier)).to.be.true);
    });

  });

  describe('byPlaceQualifier', () => {
    it('throws error for invalid contact types', () => {
      [
        {
          name: 'place-1',
          type: 'hospital',
          reported_date: 123123123
        },
        {
          name: 'place-1',
          type: 'contact',
        }
      ].forEach((qualifier) => expect(() => byPlaceQualifier(qualifier))
        .to.throw('Invalid type for contacts.'));
    });

    it('throws error for bloated lineage on parent/contact', () => {
      [
        {
          type: 'place',
          name: 'place-1',
          parent: {
            _id: '1-id',
            name: 'place-2',
            parent: {
              _id: '1-id',
            }
          }
        }, 

        {
          type: 'place',
          name: 'place-1',
          reported_date: 23232323,
          parent: {
            _id: '2-id',
            parent: {
              _id: '4-id',
              name: 'place-2',
              parent: {
                _id: '3-id',
              }
            }
            
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = qualifier.reported_date ?
          qualifier : { ...qualifier, reported_date: CURRENT_ISO_TIMESTAMP };
        expect(() => byPlaceQualifier(qualifier))
          .to.throw(`Additional fields found in the parent lineage [${JSON.stringify(expected_qualifier)}].`);
      });
      

      [
        {
          type: 'place',
          name: 'place-1',
          reported_date: 123123123,
          contact: {
            _id: '1-id',
            parent: {
              _id: '1-id',
              name: 'place-2'
            }
          }
        }, 
  
        {
          type: 'place',
          name: 'place-1',
          contact: {
            _id: '2-id',
            parent: {
              _id: '7-id',
              name: 'place-2',
              parent: {
                _id: '3-id',
              }
            }
              
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = qualifier.reported_date ?
          qualifier : { ...qualifier, reported_date: CURRENT_ISO_TIMESTAMP };
        expect(() => byPlaceQualifier(qualifier))
          .to.throw(`Additional fields found in the contact lineage [${JSON.stringify(expected_qualifier)}].`);
      });
    
    });

    it('throws error for missing required fields', () => {
      [
        {
          name: 'place-1',
          parent: {
            _id: 'p1'
          },
          contact: {
            _id: '2',
            name: 'contact-1',
            parent: {
              _id: 'p3'
            }
          }
        },
        {
          type: 'place',
          contact: {
            _id: '2',
            name: 'contact-1',
            parent: {
              _id: 'p3'
            }
          }
        }
      ].forEach((qualifier) => {
        expect(() => byPlaceQualifier(qualifier))
          .to.throw(`Missing or empty required fields (name, type) for [${JSON.stringify(qualifier)}].`);
      });
    });

    it('throws error invalid reported date formats', () => {
      const qualifier = {
        name: 'place-1',
        type: 'place',
        reported_date: '2025-10'
      };
      expect(() => byPlaceQualifier(qualifier))
        .to.throw('Invalid reported_date. Expected format to be ' +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.');
    });

    it('throws error on missing _id or parent properties in contact/parent hierarchy', () => {
      [
        {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2-id',
            parent: {
              parent: {
                _id: '3-id'
              }
            }
          }
        },
        {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2-id',
            parent: {
              name: 'place-353',
              parent: {
                _id: '3-id'
              }
            }
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = { ...qualifier, reported_date: CURRENT_ISO_TIMESTAMP };
        expect(() => byPlaceQualifier(qualifier)).to.throw(
          `Missing required fields (parent, _id) in the parent hierarchy [${JSON.stringify(
            expected_qualifier
          )}].`
        );
      });

      [
        {
          name: 'place-1',
          type: 'place',
          contact: {
            _id: '1',
            parent: {
              _id: '2',
              parent: {
                parent: {
                  _id: '1'
                }
              }
            }
          }
        },
        {
          name: 'place-1',
          type: 'place',
          contact: {
            parent: {
              _id: '2',
              parent: {
                _id: '1'
              }
            }
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = {...qualifier, reported_date: CURRENT_ISO_TIMESTAMP};
        expect(() => byPlaceQualifier(qualifier))
          .to.throw(
            `Missing required fields (parent, _id) in the contact hierarchy [${JSON.stringify(
              expected_qualifier
            )}].`
          );
      });
    });

    it('builds a qualifier to create and update place for valid data', () => {
      [
        {
          name: 'place-1',
          type: 'place'
        }, {
          name: 'place-1',
          type: 'contact',
          contact_type: 'hospital'
        }, {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2',
            parent: {
              _id: '3'
            }
          }
        }, {
          name: 'place-1',
          type: 'place',
          reported_date: 21231231, 
          contact: {
            _id: '2',
            parent: {
              _id: '3'
            }
          }
        }, {
          name: 'place-1',
          type: 'place',
          contact: {
            _id: '2',
            parent: {
              _id: '3'
            }
          },
          parent: {
            _id: '4',
            parent: {
              _id: '5'
            }
          }
        }
      ].forEach((qualifier) => {
        const expected_qualifier = {reported_date: CURRENT_ISO_TIMESTAMP, ...qualifier };
        expect(byPlaceQualifier(qualifier)).to.deep.equal(expected_qualifier);
      });
    });
  });

  describe('isPlaceQualifier', () => {
    it('return false for invalid contact types', () => {
      [
        {
          name: 'place-1',
          type: 'hospital',
          reported_date: 123123123
        },
        {
          name: 'place-1',
          type: 'contact',
        }
      ].forEach((qualifier) => expect(isPlaceQualifier(qualifier)).to.be.false);
    });

    it('returns false for bloated lineage on parent/contact', () => {
      [
        {
          type: 'place',
          name: 'place-1',
          parent: {
            _id: '1-id',
            name: 'place-2',
            parent: {
              _id: '1-id',
            }
          }
        }, 

        {
          type: 'place',
          name: 'place-1',
          reported_date: 23232323,
          parent: {
            _id: '2-id',
            parent: {
              _id: '4-id',
              name: 'place-2',
              parent: {
                _id: '3-id',
              }
            }
            
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier)).to.be.false;
      });
      

      [
        {
          type: 'place',
          name: 'place-1',
          reported_date: 123123123,
          contact: {
            _id: '1-id',
            parent: {
              _id: '1-id',
              name: 'place-2'
            }
          }
        }, 
  
        {
          type: 'place',
          name: 'place-1',
          contact: {
            _id: '2-id',
            parent: {
              _id: '7-id',
              name: 'place-2',
              parent: {
                _id: '3-id',
              }
            }
              
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier)).to.be.false;
      });
    
    });

    it('returns false for missing required fields', () => {
      [
        {
          name: 'place-1',
          parent: {
            _id: 'p1'
          },
          contact: {
            _id: '2',
            name: 'contact-1',
            parent: {
              _id: 'p3'
            }
          }
        },
        {
          type: 'place',
          contact: {
            _id: '2',
            name: 'contact-1',
            parent: {
              _id: 'p3'
            }
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier)).to.be.false;
      });
    });

    it('returns false invalid reported date formats', () => {
      const qualifier = {
        name: 'place-1',
        type: 'place',
        reported_date: '2025-10'
      };
      expect(isPlaceQualifier(qualifier)).to.be.false;
    });

    it('returns false on missing _id or parent properties in contact/parent hierarchy', () => {
      [
        {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2-id',
            parent: {
              parent: {
                _id: '3-id'
              }
            }
          }
        },
        {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2-id',
            parent: {
              name: 'place-353',
              parent: {
                _id: '3-id'
              }
            }
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier))
          .to.be.false;
      });

      [
        {
          name: 'place-1',
          type: 'place',
          contact: {
            _id: '1',
            parent: {
              _id: '2',
              parent: {
                parent: {
                  _id: '1'
                }
              }
            }
          }
        },
        {
          name: 'place-1',
          type: 'place',
          contact: {
            parent: {
              _id: '2',
              parent: {
                _id: '1'
              }
            }
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier))
          .to.be.false;
      });
    });

    it('returns true for valid data', () => {
      [
        {
          name: 'place-1',
          type: 'place'
        }, {
          name: 'place-1',
          type: 'contact',
          contact_type: 'hospital'
        }, {
          name: 'place-1',
          type: 'place',
          parent: {
            _id: '2',
            parent: {
              _id: '3'
            }
          }
        }, {
          name: 'place-1',
          type: 'place',
          reported_date: 21231231, 
          contact: {
            _id: '2',
            parent: {
              _id: '3'
            }
          }
        }, {
          name: 'place-1',
          type: 'place',
          contact: {
            _id: '2',
            parent: {
              _id: '3'
            }
          },
          parent: {
            _id: '4',
            parent: {
              _id: '5'
            }
          }
        }
      ].forEach((qualifier) => {
        expect(isPlaceQualifier(qualifier)).to.be.true;
      });
    });
  });
});
