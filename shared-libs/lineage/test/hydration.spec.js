const chai = require('chai');
const sinon = require('sinon');
const lineageFactory = require('../src');

describe('Lineage', function() {
  let lineage;
  let allDocs;
  let get;
  let query;
  let DB;

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

  describe('fetchContacts', function() {
    it('fetches contacts with correct parameters', function() {
      allDocs.resolves({ rows: [] });
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi' } },
        { _id: 'ghi' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.getCall(0).args[0]).to.deep.equal({ keys: ['def'], include_docs: true });
      });
    });

    it('does not fetch contacts that it has already got via lineage', function() {
      allDocs.resolves({ rows: [] });
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'def' } },
        { _id: 'def' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });
  });

  describe('fillContactsInDocs', function() {
    it('populates the contact field for relevant docs', function() {
      // Given
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

      // when
      lineage.fillContactsInDocs(docs, contacts);

      // then
      chai.expect(docs[0].contact).to.deep.equal(contacts[0]);
      chai.expect(docs[1].contact).to.deep.equal(contacts[0]);
      chai.expect(docs[2].contact).to.deep.equal(contacts[1]);
      chai.expect(docs[3].contact).to.deep.equal({ _id: 'contactx' });
    });
  });

  describe('fillParentsInDocs', function() {
    it('populates parent fields throughout lineage', function() {
      // Given
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

      // when
      lineage.fillParentsInDocs(doc, fakeLineage);

      // then
      chai.expect(doc.parent._id).to.deep.equal(fakeLineage[0]._id);
      chai.expect(doc.parent.type).to.deep.equal(fakeLineage[0].type);
      chai.expect(doc.parent.parent._id).to.equal('c');
      chai.expect(doc.parent.parent.parent).to.deep.equal(fakeLineage[2]);
    });

    it('correctly populates parent fields for reports', function() {
      // Given
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

      // when
      lineage.fillParentsInDocs(report, fakeLineage);

      // then
      chai.expect(report.contact).to.deep.equal(contactInLineage);
      chai.expect(report.contact.parent._id).to.equal('b');
      chai.expect(report.contact.parent.parent).to.deep.equal(fakeLineage[1]);
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
      const docs = [
        { _id: 'a' },
        { _id: 'b' },
      ];

      return lineage.hydrateDocs(docs).then((hydratedDocs) => {
        chai.expect(hydratedDocs).to.deep.equal(docs);
      });
    });
  });
});
