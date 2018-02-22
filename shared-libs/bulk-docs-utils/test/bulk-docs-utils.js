const chai = require('chai');
const sinon = require('sinon').sandbox.create();
const utilsFactory = require('../src/bulk-docs-utils');

describe('Bulk Docs utils', function() {
  let get;
  let DB;
  let utils;

  beforeEach(function() {
    get = sinon.stub();
    DB = { get: get, query: sinon.stub() };
    utils = utilsFactory({ Promise, DB });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('updateParentContacts', function() {
    it('updates clinic deleted person is contact for', function() {
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
      get.returns(Promise.resolve(clinic));
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal(clinic._id);
        chai.expect(updatedParents).to.have.length(1);
        chai.expect(updatedParents[0]).to.deep.equal(expected);
      });
    });

    it('does not update clinic when id does not match', function() {
      var clinic = {
        _id: 'b',
        type: 'clinic',
        contact: {
          _id: 'c',
          name: 'sally'
        }
      };
      var person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      get.returns(Promise.resolve(clinic));
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal(clinic._id);
        chai.expect(updatedParents.length).to.equal(0);
      });
    });

    it('handles the parents contact being undefined - #2416', function() {
      var clinic = {
        _id: 'b',
        type: 'clinic'
      };
      var person = {
        _id: 'a',
        type: 'person',
        name: 'sally',
        parent: {
          _id: 'b'
        }
      };
      get.returns(Promise.resolve(clinic));
      return utils.updateParentContacts([person]).then(updatedParents => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal(clinic._id);
        chai.expect(updatedParents).to.have.length(0);
      });
    });
  });

  describe('getDuplicateErrors', function() {
    it('generates errors on duplicate docs', function() {
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
    });
  });
});
