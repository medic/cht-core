const chai = require('chai');
const sinon = require('sinon');
const lineageFactory = require('../src');
const { Contact } = require('@medic/cht-datasource');
const dataContext = require('../../../api/src/services/data-context');

describe('Lineage', function() {
  let lineage;
  let getStub;
  let getWithLineageStub;

  beforeEach(function() {
    getStub = sinon.stub();
    getWithLineageStub = sinon.stub();

    sinon.stub(dataContext, 'bind').callsFake(fn => {
      if (fn === Contact.v1.get) {
        return (qualifier) => getStub(qualifier.uuid);
      }
      if (fn === Contact.v1.getWithLineage) {
        return (qualifier) => getWithLineageStub(qualifier.uuid);
      }
      return sinon.stub().resolves();
    });

    const mockFactoryDataContext = {
      bind: dataContext.bind
    };
    lineage = lineageFactory(Promise, {}, mockFactoryDataContext);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('fetchLineageById', function() {
    it('calls getWithLineage with correct parameters', function() {
      getWithLineageStub.resolves([]);
      const id = 'banana';

      return lineage.fetchLineageById(id).then(() => {
        chai.expect(dataContext.bind.callCount).to.be.at.least(1);
        chai.expect(dataContext.bind.calledWith(Contact.v1.getWithLineage)).to.be.true;
        chai.expect(getWithLineageStub.callCount).to.equal(1);
        chai.expect(getWithLineageStub.getCall(0).args[0]).to.equal(id);
      });
    });
  });

  describe('fetchContacts', function() {
    it('fetches contacts with correct parameters', function() {
      getStub.resolves({ _id: 'def' }); 
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi' } },
        { _id: 'ghi' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(dataContext.bind.callCount).to.be.at.least(1);
        chai.expect(dataContext.bind.calledWith(Contact.v1.get)).to.be.true;
        chai.expect(getStub.callCount).to.equal(1);
        chai.expect(getStub.getCall(0).args[0]).to.deep.equal('def');
      });
    });

    it('does not fetch contacts that it has already got via lineage', function() {
      getStub.resolves(); 
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'def' } },
        { _id: 'def' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(getStub.callCount).to.equal(0);
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
