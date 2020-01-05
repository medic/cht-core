const chai = require('chai');
const lineageFactory = require('../src');

describe('Minify', function() {

  let lineage;
  beforeEach(function() {
    lineage = lineageFactory({}, {});
  });

  describe('minifyLineage', function() {
    it('removes everything except id', function() {
      const parent = {
        _id: 'abc',
        type: 'clinic',
        parent: {
          _id: 'def',
          type: 'person'
        }
      };
      const minified = {
        _id: 'abc',
        parent: {
          _id: 'def'
        }
      };

      chai.expect(lineage.minifyLineage(parent)).to.deep.equal(minified);
    });
  });

  describe('minify', function() {
    it('handles null argument', function() {
      // just make sure it doesn't blow up!
      lineage.minify(null);
    });

    it('minifies the parent', function() {
      // Given
      const actual = {
        _id: 'c',
        name: 'cathy',
        parent: {
          _id: 'a',
          name: 'arnold',
          parent: {
            _id: 'b',
            name: 'barry'
          }
        }
      };
      const expected = {
        _id: 'c',
        name: 'cathy',
        parent: {
          _id: 'a',
          parent: {
            _id: 'b'
          }
        }
      };

      // when
      lineage.minify(actual);

      // then
      chai.expect(actual).to.deep.equal(expected);
    });

    it('minifies the contact and lineage', function() {
      // Given
      const actual = {
        _id: 'c',
        name: 'cathy',
        parent: {
          _id: 'a',
          name: 'arnold',
          parent: {
            _id: 'b',
            name: 'barry'
          }
        },
        contact: {
          _id: 'd',
          name: 'daniel',
          parent: {
            _id: 'e',
            name: 'elisa'
          }
        }
      };
      const expected = {
        _id: 'c',
        name: 'cathy',
        parent: {
          _id: 'a',
          parent: {
            _id: 'b'
          }
        },
        contact: {
          _id: 'd',
          parent: {
            _id: 'e'
          }
        }
      };

      // when
      lineage.minify(actual);

      // then
      chai.expect(actual).to.deep.equal(expected);
    });

    it('removes the patient', function() {
      // Given
      const actual = {
        _id: 'c',
        type: 'data_record',
        patient_id: '123',
        patient: {
          _id: 'a',
          name: 'Alice',
          patient_id: '123',
          parent: {
            _id: 'b',
            name: 'Bob'
          }
        }
      };
      const expected = {
        _id: 'c',
        type: 'data_record',
        patient_id: '123'
      };

      // when
      lineage.minify(actual);

      // then
      chai.expect(actual).to.deep.equal(expected);
    });

    it('removes the place', () => {
      // Given
      const actual = {
        _id: 'c',
        type: 'data_record',
        place_id: '123',
        place: {
          _id: 'a',
          name: 'Alice',
          place_id: '123',
          parent: {
            _id: 'b',
            name: 'Bob'
          }
        }
      };
      const expected = {
        _id: 'c',
        type: 'data_record',
        place_id: '123'
      };

      // when
      lineage.minify(actual);

      // then
      chai.expect(actual).to.deep.equal(expected);
    });

    it('errors out on potential infinite recursion', function() {
      const doc = {
        _id: 'same_id',
        type: 'clinic'
      };
      doc.parent = doc;

      chai.expect(() => lineage.minify(doc)).to.throw();
    });
  });
});
