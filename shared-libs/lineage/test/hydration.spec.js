const chai = require('chai');
const sinon = require('sinon');
const lineageFactory = require('../src');
const { DOC_TYPES, CONTACT_TYPES } = require('@medic/constants');

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
      get.resolves({ _id: 'banana', type: CONTACT_TYPES.CLINIC, parent: { _id: 'apple' } });
      allDocs.resolves({ rows: [{ doc: { _id: 'apple' } }] });
      const id = 'banana';

      return lineage.fetchLineageById(id).then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.getCall(0).args[0]).to.equal('banana');
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.getCall(0).args[0]).to.deep.equal({ keys: ['apple'], include_docs: true });
      });
    });

    it('returns the report followed by its contact lineage', function() {
      const report = {
        _id: 'report',
        type: DOC_TYPES.DATA_RECORD,
        form: 'form',
        contact: { _id: 'contact1', parent: { _id: 'contact2' } },
      };
      const contact1 = { _id: 'contact1' };
      const contact2 = { _id: 'contact2' };
      get.resolves(report);
      allDocs.resolves({ rows: [{ doc: contact1 }, { doc: contact2 }] });

      return lineage.fetchLineageById('report').then(result => {
        chai.expect(allDocs.getCall(0).args[0].keys).to.deep.equal(['contact1', 'contact2']);
        chai.expect(result).to.deep.equal([report, contact1, contact2]);
      });
    });

    it('returns only the doc when there is no lineage to fetch', function() {
      const report = { _id: 'report', type: DOC_TYPES.DATA_RECORD, form: 'form' };
      get.resolves(report);

      return lineage.fetchLineageById('report').then(result => {
        chai.expect(allDocs.callCount).to.equal(0);
        chai.expect(result).to.deep.equal([report]);
      });
    });

    it('stops at the first link without an _id', function() {
      const contact = {
        _id: 'contact1',
        type: 'person',
        parent: { _id: 'contact2', parent: { parent: { _id: 'contact4' } } },
      };
      const contact2 = { _id: 'contact2' };
      get.resolves(contact);
      allDocs.resolves({ rows: [{ doc: contact2 }] });

      return lineage.fetchLineageById('contact1').then(result => {
        chai.expect(allDocs.getCall(0).args[0].keys).to.deep.equal(['contact2']);
        chai.expect(result).to.deep.equal([contact, contact2]);
      });
    });

    it('follows a deep parent chain', function() {
      const depth = 9;
      const doc = { _id: 'person', type: 'person', parent: {} };
      const parentIds = [];
      let currentParent = doc.parent;
      for (let i = 1; i <= depth; i++) {
        parentIds.push(`parent${i}`);
        currentParent._id = `parent${i}`;
        currentParent.parent = {};
        currentParent = currentParent.parent;
      }
      get.resolves(doc);
      allDocs.resolves({ rows: parentIds.map(_id => ({ doc: { _id } })) });

      return lineage.fetchLineageById('person').then(result => {
        chai.expect(allDocs.getCall(0).args[0].keys).to.deep.equal(parentIds);
        chai.expect(result).to.deep.equal([doc, ...parentIds.map(_id => ({ _id }))]);
      });
    });

    [
      { name: 'a data_record without a form', doc: { _id: 'message', type: DOC_TYPES.DATA_RECORD, sms_message: {} } },
      { name: 'a non-contact doc with a parent', doc: { _id: 'settings', type: 'settings', parent: { _id: 'a' } } },
      { name: 'a doc with no lineage', doc: { _id: 'translations', type: DOC_TYPES.TRANSLATIONS } },
    ].forEach(({ name, doc }) => {
      it(`returns nothing for ${name}`, function() {
        get.resolves(doc);

        return lineage.fetchLineageById(doc._id).then(result => {
          chai.expect(allDocs.callCount).to.equal(0);
          chai.expect(result).to.deep.equal([]);
        });
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
    it('skips null docs in the array', function() {
      const docs = [null, { _id: 'doc1', contact: { _id: 'contact1' } }];
      const contacts = [{ _id: 'contact1', type: 'person' }];

      lineage.fillContactsInDocs(docs, contacts);

      chai.expect(docs[0]).to.be.null;
      chai.expect(docs[1].contact).to.deep.equal(contacts[0]);
    });

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
        { _id: 'b', type: CONTACT_TYPES.CLINIC },
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
        type: DOC_TYPES.DATA_RECORD,
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
        { _id: 'c', type: CONTACT_TYPES.CLINIC }
      ];

      // when
      lineage.fillParentsInDocs(report, fakeLineage);

      // then
      chai.expect(report.contact).to.deep.equal(contactInLineage);
      chai.expect(report.contact.parent._id).to.equal('b');
      chai.expect(report.contact.parent.parent).to.deep.equal(fakeLineage[1]);
    });
  });

  describe('fetchHydratedDoc', function() {
    it('supports callback as second argument', function(done) {
      get.resolves({ _id: 'a', type: 'person' });

      lineage.fetchHydratedDoc('a', function(err, result) {
        chai.expect(err).to.be.null;
        chai.expect(result._id).to.equal('a');
        done();
      });
    });

    it('passes error to callback', function(done) {
      get.rejects(new Error('db fail'));

      lineage.fetchHydratedDoc('a', function(err) {
        chai.expect(err.message).to.equal('db fail');
        done();
      });
    });

    it('returns docs without lineage without fetching them again', function() {
      const doc = { _id: 'a', type: DOC_TYPES.TRANSLATIONS };
      get.resolves(doc);

      return lineage.fetchHydratedDoc('a').then(result => {
        chai.expect(result).to.deep.equal(doc);
        chai.expect(get.callCount).to.equal(1);
        chai.expect(allDocs.callCount).to.equal(0);
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('rejects with a 404 when the doc is missing', function() {
      const err = new Error('missing');
      err.status = 404;
      get.rejects(err);

      return lineage.fetchHydratedDoc('a')
        .then(() => chai.expect.fail('should have thrown'))
        .catch(e => {
          chai.expect(e.statusCode).to.equal(404);
        });
    });

    it('throws when lineage is empty and throwWhenMissingLineage is true', function() {
      get.resolves({ _id: 'a', type: DOC_TYPES.TRANSLATIONS });

      return lineage.fetchHydratedDoc('a', { throwWhenMissingLineage: true })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.message).to.include('Document not found: a');
          chai.expect(err.code).to.equal(404);
        });
    });
  });

  describe('fetchHydratedDocs', function() {
    it('returns empty array for empty docIds', function() {
      return lineage.fetchHydratedDocs([]).then(result => {
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('throws non-404 errors for single doc', function() {
      const err = new Error('server error');
      err.status = 500;
      get.rejects(err);

      return lineage.fetchHydratedDocs(['a'])
        .then(() => chai.expect.fail('should have thrown'))
        .catch(e => {
          chai.expect(e.message).to.equal('server error');
        });
    });
  });

  describe('hydrateDocs', function() {
    it('works on empty array', function() {
      const docs = [];

      return lineage.hydrateDocs(docs).then((hydratedDocs) => {
        chai.expect(hydratedDocs).to.have.length(0);
      });
    });

    it('handles reports without contact id', function() {
      const docs = [
        { _id: 'r1', type: DOC_TYPES.DATA_RECORD },
      ];

      return lineage.hydrateDocs(docs).then(result => {
        chai.expect(result).to.have.length(1);
        chai.expect(result[0]._id).to.equal('r1');
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
