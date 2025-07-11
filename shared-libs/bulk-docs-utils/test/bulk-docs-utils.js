const chai = require('chai');
const sinon = require('sinon');
const utilsFactory = require('../src/bulk-docs-utils');
const { Contact } = require('@medic/cht-datasource');

describe('Bulk Docs utils', () => {
  let utils;
  let bind;
  let getContact;

  beforeEach(() => {
    getContact = sinon.stub();
    bind = sinon.stub().returns(getContact);
    utils = utilsFactory({ Promise, dataContext: { bind } });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('updateParentContacts', () => {
    it('updates clinic deleted person is contact for', () => {
      const clinic = {
        _id: 'b',
        type: 'clinic',
        contact: {
          _id: 'a',
          name: 'sally'
        }
      };
      const person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      const expected = Object.assign({}, clinic, { contact: null });
      getContact.resolves(clinic);
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(bind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        chai.expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
        chai.expect(updatedParents.docs).to.have.length(1);
        chai.expect(updatedParents.docs[0]).to.deep.equal(expected);
      });
    });

    it('does not update clinic when id does not match', () => {
      const clinic = {
        _id: 'b',
        type: 'clinic',
        contact: {
          _id: 'c',
          name: 'sally'
        }
      };
      const person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      getContact.resolves(clinic);
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(bind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        chai.expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
        chai.expect(updatedParents.docs.length).to.equal(0);
      });
    });

    it('returns a map from parents back to their child docs', () => {
      const clinic = {
        _id: 'b',
        type: 'clinic',
        contact: {
          _id: 'a',
          name: 'sally'
        }
      };
      const person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      getContact.resolves(clinic);
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(updatedParents.documentByParentId[clinic._id]).to.deep.equal(person);
        chai.expect(bind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        chai.expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
      });
    });

    it('handles the parents contact being undefined - #2416', () => {
      const clinic = {
        _id: 'b',
        type: 'clinic'
      };
      const person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      getContact.resolves(clinic);
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(bind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        chai.expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
        chai.expect(updatedParents.docs).to.have.length(0);
      });
    });
  });

  describe('getDuplicateErrors', () => {
    it('generates errors on duplicate docs', () => {
      const clinic = {
        _id: 'b',
        type: 'clinic',
        contact: {
          name: 'sally',
          phone: '+555'
        }
      };
      chai.expect(utils.getDuplicateErrors([ clinic ])).to.have.length(0);
      chai.expect(utils.getDuplicateErrors([ clinic, clinic ])).to.have.length(1);
      chai.expect(bind.notCalled).to.be.true;
      chai.expect(getContact.notCalled).to.be.true;
    });
  });
});
