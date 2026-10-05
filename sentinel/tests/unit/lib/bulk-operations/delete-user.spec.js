const sinon = require('sinon');
const { expect } = require('chai');

const config = require('../../../../src/config');
const db = require('../../../../src/db');
const dataContext = require('../../../../src/data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const { deleteUser } = require('../../../../src/lib/bulk-operations/delete-user');

describe('bulk-operations delete-user handler', () => {
  let deleteUserStub;

  beforeEach(() => {
    deleteUserStub = sinon.stub(users, 'deleteUser');
  });

  afterEach(() => sinon.restore());

  it('deletes each user via the user-delete path, stripping the couch prefix', async () => {
    deleteUserStub.resolves();

    const failed = await deleteUser([ { id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(deleteUserStub.args.map(a => a[0])).to.deep.equal([ 'alice', 'bob' ]);
  });

  it('records a user that fails to delete as failed and keeps deleting the rest', async () => {
    deleteUserStub.withArgs('alice').resolves();
    deleteUserStub.withArgs('bob').rejects(new Error('boom'));
    deleteUserStub.withArgs('carol').resolves();

    const failed = await deleteUser(
      [ { id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' }, { id: 'org.couchdb.user:carol' } ],
      'action-1'
    );

    expect(failed.map(op => op.id)).to.deep.equal([ 'org.couchdb.user:bob' ]);
    expect(deleteUserStub.args.map(a => a[0])).to.deep.equal([ 'alice', 'bob', 'carol' ]);
  });

  it('re-runs the whole batch after a half-finished attempt without reporting failures', async () => {
    // One user removed on the earlier attempt, one still to go.
    deleteUserStub.withArgs('done-1').rejects(Object.assign(new Error('not found'), { status: 404 }));
    deleteUserStub.withArgs('todo-1').resolves();

    const failed = await deleteUser(
      [ { id: 'org.couchdb.user:done-1' }, { id: 'org.couchdb.user:todo-1' } ],
      'action-1'
    );

    expect(failed).to.deep.equal([]);
    expect(deleteUserStub.callCount).to.equal(2);
  });

  it('counts a user that is already gone as done, so a re-run converges', async () => {
    deleteUserStub.rejects(Object.assign(new Error('not found'), { status: 404 }));

    const failed = await deleteUser([ { id: 'org.couchdb.user:chw' } ], 'action-1');

    expect(failed).to.deep.equal([]);
  });

  it('lets a failure worth another attempt through, for the caller to classify', async () => {
    deleteUserStub.rejects(Object.assign(new Error('couch down'), { status: 503 }));

    await expect(deleteUser([ { id: 'org.couchdb.user:chw' } ], 'action-1'))
      .to.be.rejectedWith('couch down');
  });

  it('fails an operation with no id without calling the delete path', async () => {
    deleteUserStub.resolves();

    const failed = await deleteUser([ {} ], 'action-1');

    expect(failed).to.have.length(1);
    expect(deleteUserStub.called).to.equal(false);
  });
});
