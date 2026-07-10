const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const expect = chai.expect;

describe('bulk-operations delete-user handler', () => {
  let deleteUser;
  let deleteUserStub;

  beforeEach(() => {
    deleteUser = rewire('../../../../src/lib/bulk-operations/delete-user');
    deleteUserStub = sinon.stub();
    deleteUser.__set__('userManagement', { deleteUser: deleteUserStub });
  });

  afterEach(() => sinon.restore());

  it('deletes each user via the user-delete path, stripping the couch prefix', () => {
    deleteUserStub.resolves();

    return deleteUser([ { id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' } ], 'action-1')
      .then(failed => {
        expect(failed).to.deep.equal([]);
        expect(deleteUserStub.args.map(a => a[0])).to.deep.equal([ 'alice', 'bob' ]);
      });
  });

  it('records a user that fails to delete as failed and keeps going', () => {
    deleteUserStub.withArgs('alice').resolves();
    deleteUserStub.withArgs('bob').rejects(new Error('boom'));

    return deleteUser([ { id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' } ], 'action-1')
      .then(failed => {
        expect(failed.map(op => op.id)).to.deep.equal([ 'org.couchdb.user:bob' ]);
      });
  });

  it('fails an operation with no id without calling the delete path', () => {
    deleteUserStub.resolves();

    return deleteUser([ {} ], 'action-1').then(failed => {
      expect(failed).to.have.length(1);
      expect(deleteUserStub.called).to.equal(false);
    });
  });
});
