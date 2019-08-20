const chai = require('chai');
const sinon = require('sinon');
const lineageFactory = require('../src');

describe('Lineage', function() {
  let lineage,
      allDocs,
      get,
      query,
      DB;

  beforeEach(function() {
    allDocs = sinon.stub();
    get = sinon.stub();
    query = sinon.stub();
    DB = { allDocs, get, query };
    lineage = lineageFactory(Promise, DB);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('fetchLineageById', function() {
    it('queries db with correct parameters', function() {
      query.resolves({ rows: [] });
      const id = 'banana';

      return lineage.fetchLineageById(id).then(() => {
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.getCall(0).args[0]).to.equal('medic-client/docs_by_id_lineage');
        chai.expect(query.getCall(0).args[1].startkey).to.deep.equal([ id ]);
        chai.expect(query.getCall(0).args[1].endkey).to.deep.equal([ id, {} ]);
        chai.expect(query.getCall(0).args[1].include_docs).to.deep.equal(true);
      });
    });
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

    it('errors out on potential infinite recursion', function() {
      const doc = {
        _id: 'same_id',
        type: 'clinic'
      };
      doc.parent = doc;

      chai.expect(() => lineage.minify(doc)).to.throw();
    });
  });

  describe('hydrateDocs', function() {
    it('works on empty array', function() {
      const docs = [];

      return lineage.hydrateDocs(docs).then((hydratedDocs) => {
        chai.expect(hydratedDocs).to.have.length(0);
      });
    });

    it('works on docs without contacts or parents', function() {
      query.resolves({ rows: [] });
      const docs = [
        { _id: 'a' },
        { _id: 'b' },
      ];

      return lineage.hydrateDocs(docs).then(hydratedDocs => {
        chai.expect(hydratedDocs).to.deep.equal(docs);
      });
    });
  });
});
