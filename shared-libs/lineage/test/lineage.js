const chai = require('chai');
const sinon = require('sinon').sandbox.create();
const lineageFactory = require('../src/lineage');

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

  it('fetchContacts fetches contacts that it has not got via lineage', function() {
    allDocs.resolves({ rows: [] });
    const fakeLineage = [
      { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi' } },
      { _id: 'ghi' }
    ];
    return lineage.fetchContacts(fakeLineage).then(() => {
      chai.expect(allDocs.getCall(0).args[0]).to.deep.equal({ keys: ['def'], include_docs: true });
    });
  });

  it('fillContactsInDocs populates the contact field for relevant docs', function() {
    const docs = [
      { _id: 'doc1', contact: { _id: 'contact1' } },
      { _id: 'doc2', contact: { _id: 'contact1' } },
      { _id: 'doc3', contact: { _id: 'contact2' } },
      { _id: 'doc4', contact: { _id: 'contactx' } }
    ];
    const contacts = [
      { _id: 'contact1', type: 'person' },
      { _id: 'contact2', type: 'person' }
    ];
    lineage.fillContactsInDocs(docs, contacts);
    chai.expect(docs[0].contact).to.deep.equal(contacts[0]);
    chai.expect(docs[1].contact).to.deep.equal(contacts[0]);
    chai.expect(docs[2].contact).to.deep.equal(contacts[1]);
    chai.expect(docs[3].contact).to.deep.equal({ _id: 'contactx' });
  });

  it('fillParentsInDocs populates parent fields throughout lineage', function() {
    const doc = {
      _id: 'a',
      parent: {
        _id: 'b',
        parent: {
          _id: 'c',
          parent: {
            _id: 'd'
          }
        }
      }
    };
    const fakeLineage = [
      { _id: 'b', type: 'clinic' },
      null,
      { _id: 'd', type: 'person' },
    ];
    lineage.fillParentsInDocs(doc, fakeLineage);
    chai.expect(doc.parent).to.deep.equal(fakeLineage[0]);
    chai.expect(doc.parent.parent._id).to.equal('c');
    chai.expect(doc.parent.parent.parent).to.deep.equal(fakeLineage[2]);
  });

  it('fillParentsInDocs correctly populates parent fields for reports', function() {
    const report = {
      _id: 'a',
      type: 'data_record',
      contact: {
        _id: 'contact',
        parent: {
          _id: 'b',
          parent: {
            _id: 'c'
          }
        }
      }
    };
    const contactInLineage = { _id: 'contact', type: 'person', parent: { _id: 'b', parent: { _id: 'c' } } };
    const fakeLineage = [
      contactInLineage,
      null,
      { _id: 'c', type: 'clinic' }
    ];
    lineage.fillParentsInDocs(report, fakeLineage);
    chai.expect(report.contact).to.deep.equal(contactInLineage);
    chai.expect(report.contact.parent._id).to.equal('b');
    chai.expect(report.contact.parent.parent).to.deep.equal(fakeLineage[1]);
  });

  it('minifyLineage removes everything except id', function() {
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

  it('minify handles null argument', function() {
    lineage.minify(null);
    // just make sure it doesn't blow up!
  });

  it('minify minifies the parent', function() {
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
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('minify minifies the contact and lineage', function() {
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
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('minify removes the patient', function() {
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
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('hydrateDocs works on empty array', function() {
    const docs = [];
    return lineage.hydrateDocs(docs).then((hydratedDocs) => {
      chai.expect(hydratedDocs).to.have.length(0);
    });
  });

  it('hydrateDocs works on docs without contacts or parents', function() {
    const docs = [
      { _id: 'a' },
      { _id: 'b' },
    ];
    return lineage.hydrateDocs(docs).then((hydratedDocs) => {
      chai.expect(hydratedDocs).to.deep.equal(docs);
    });
  });
});
