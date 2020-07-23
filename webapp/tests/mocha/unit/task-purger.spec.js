const taskPurgerSpec = require('../../../src/js/bootstrapper/task-purger');
const sinon = require('sinon');
const chai = require('chai');

let localDb;
let userCtx;

describe('Purger', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(done => {

    fetch = sinon.stub();
    localDb = {
      get: sinon.stub(),
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub(),
      query: sinon.stub(),
    };
    userCtx = { roles: [], name: 'userName' };
    done();
  });

  describe('shouldPurge', () => {
    it('should return false on local db errors', () => {
      localDb.get.withArgs('settings').rejects({ some: 'error' });
      return taskPurgerSpec.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args).to.deep.equal([['settings']]);
      });
    });

    it('should return false when settings doc is malformed', () => {
      localDb.get.withArgs('settings').resolves({  });
      return taskPurgerSpec.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purge is not configured', () => {
      localDb.get.withArgs('settings').resolves({ settings: {} });

      return taskPurgerSpec.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when no purges configured', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [] } });
      return taskPurgerSpec.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return true when purges are configured', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [{ event_name: 'aaaa' }] } });
      return taskPurgerSpec.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(true);
      });
    });
  });

  describe('purge', () => {
    it('should skip eventless configs', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [{ all_contacts: true }] } });

      return taskPurgerSpec.purge(localDb, userCtx).then(() => {
        chai.expect(localDb.allDocs.callCount).to.equal(0);
        chai.expect(localDb.bulkDocs.callCount).to.equal(0);
      });
    });


    describe('for single contact', () => {
      it('should purge tasks for the contact associated with the user, in batches', () => {
        localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [{ event_name: 'event' }] } });
        localDb.get.withArgs('org.couchdb.user:userName').resolves({ contact_id: 'user_contact' });

        const batch1 = [
          { id: 'task~event~1', value: { rev: '1' } },
          { id: 'task~event~2', value: { rev: '2' } },
          { id: 'task~event~3', value: { rev: '3' } },
          { id: 'task~event~4', value: { rev: '4' } },
        ];
        const batch2 = [
          { id: 'task~event~5', value: { rev: '5' } },
          { id: 'task~event~6', value: { rev: '6' } },
          { id: 'task~event~7', value: { rev: '7' } },
          { id: 'task~event~8', value: { rev: '8' } },
        ];

        localDb.allDocs
          .onCall(0).resolves({ rows: batch1 })
          .onCall(1).resolves({ rows: batch2 })
          .onCall(2).resolves({ rows: [] });

        localDb.bulkDocs.resolves([]);

        return taskPurgerSpec.purge(localDb, userCtx).then(() => {
          chai.expect(localDb.get.callCount).to.equal(2);
          chai.expect(localDb.get.args).to.deep.equal([['settings'],['org.couchdb.user:userName']]);

          chai.expect(localDb.allDocs.callCount).to.equal(3);
          const args = {
            start_key: 'task~org.couchdb.user:userName~user_contact~event',
            end_key: 'task~org.couchdb.user:userName~user_contact~event\ufff0',
            limit: 100,
          };
          chai.expect(localDb.allDocs.args[0]).to.deep.equal([args]);
          chai.expect(localDb.allDocs.args[1]).to.deep.equal([args]);
          chai.expect(localDb.allDocs.args[2]).to.deep.equal([args]);

          chai.expect(localDb.bulkDocs.callCount).to.equal(2);
          chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'task~event~1', _rev: '1', _deleted: true, purged: true },
            { _id: 'task~event~2', _rev: '2', _deleted: true, purged: true },
            { _id: 'task~event~3', _rev: '3', _deleted: true, purged: true },
            { _id: 'task~event~4', _rev: '4', _deleted: true, purged: true },
          ]]);
          chai.expect(localDb.bulkDocs.args[1]).to.deep.equal([[
            { _id: 'task~event~5', _rev: '5', _deleted: true, purged: true },
            { _id: 'task~event~6', _rev: '6', _deleted: true, purged: true },
            { _id: 'task~event~7', _rev: '7', _deleted: true, purged: true },
            { _id: 'task~event~8', _rev: '8', _deleted: true, purged: true },
          ]]);
        });
      });
    });

    describe('for all contacts', () => {
      it('should purge tasks for all contacts, in batches', () => {
        localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [{ event_name: 'evt', all_contacts: true }] } });
        localDb.query.withArgs('medic-client/contacts_by_type').resolves({ rows: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] });

        const batch1 = [
          { id: 'task~c1~event~1', value: { rev: '1' } },
          { id: 'task~c1~event~2', value: { rev: '2' } },
          { id: 'task~c1~event~3', value: { rev: '3' } },
          { id: 'task~c1~event~4', value: { rev: '4' } },
        ];
        const batch2 = [
          { id: 'task~c1~event~5', value: { rev: '5' } },
          { id: 'task~c1~event~6', value: { rev: '6' } },
          { id: 'task~c1~event~7', value: { rev: '7' } },
          { id: 'task~c1~event~8', value: { rev: '8' } },
        ];

        localDb.allDocs.withArgs(sinon.match({ start_key: 'task~org.couchdb.user:userName~c1~evt'}))
          .onCall(0).resolves({ rows: batch1 })
          .onCall(1).resolves({ rows: batch2 })
          .onCall(2).resolves({ rows: [] });

        localDb.allDocs.withArgs(sinon.match({ start_key: 'task~org.couchdb.user:userName~c2~evt'}))
          .resolves({ rows: [] });

        const batch3 = [
          { id: 'task~c3~event~9', value: { rev: '9' } },
          { id: 'task~c3~event~10', value: { rev: '10' } },
          { id: 'task~c3~event~11', value: { rev: '11' } },
          { id: 'task~c3~event~12', value: { rev: '12' } },
        ];
        localDb.allDocs.withArgs(sinon.match({ start_key: 'task~org.couchdb.user:userName~c3~evt'}))
          .onCall(0).resolves({ rows: batch3 })
          .onCall(1).resolves({ rows: [] });

        localDb.bulkDocs.resolves([]);

        return taskPurgerSpec.purge(localDb, userCtx).then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args).to.deep.equal([['settings']]);
          chai.expect(localDb.query.callCount).to.equal(1);
          chai.expect(localDb.query.args[0]).to.deep.equal(['medic-client/contacts_by_type']);

          console.log(localDb.allDocs.args);
          chai.expect(localDb.allDocs.callCount).to.equal(6);

          chai.expect(localDb.allDocs.args).to.deep.equal([
            [{
              start_key: 'task~org.couchdb.user:userName~c1~evt',
              end_key: 'task~org.couchdb.user:userName~c1~evt\ufff0',
              limit: 100,
            }],
            [{
              start_key: 'task~org.couchdb.user:userName~c1~evt',
              end_key: 'task~org.couchdb.user:userName~c1~evt\ufff0',
              limit: 100,
            }],
            [{
              start_key: 'task~org.couchdb.user:userName~c1~evt',
              end_key: 'task~org.couchdb.user:userName~c1~evt\ufff0',
              limit: 100,
            }],
            [{
              start_key: 'task~org.couchdb.user:userName~c2~evt',
              end_key: 'task~org.couchdb.user:userName~c2~evt\ufff0',
              limit: 100,
            }],
            [{
              start_key: 'task~org.couchdb.user:userName~c3~evt',
              end_key: 'task~org.couchdb.user:userName~c3~evt\ufff0',
              limit: 100,
            }],
            [{
              start_key: 'task~org.couchdb.user:userName~c3~evt',
              end_key: 'task~org.couchdb.user:userName~c3~evt\ufff0',
              limit: 100,
            }],
          ]);

          chai.expect(localDb.bulkDocs.callCount).to.equal(3);
          chai.expect(localDb.bulkDocs.args).to.deep.equal([
            [[
              { _id: 'task~c1~event~1', _rev: '1', _deleted: true, purged: true },
              { _id: 'task~c1~event~2', _rev: '2', _deleted: true, purged: true },
              { _id: 'task~c1~event~3', _rev: '3', _deleted: true, purged: true },
              { _id: 'task~c1~event~4', _rev: '4', _deleted: true, purged: true },
            ]],
            [[
              { _id: 'task~c1~event~5', _rev: '5', _deleted: true, purged: true },
              { _id: 'task~c1~event~6', _rev: '6', _deleted: true, purged: true },
              { _id: 'task~c1~event~7', _rev: '7', _deleted: true, purged: true },
              { _id: 'task~c1~event~8', _rev: '8', _deleted: true, purged: true },
            ]],
            [[
              { _id: 'task~c3~event~9', _rev: '9', _deleted: true, purged: true },
              { _id: 'task~c3~event~10', _rev: '10', _deleted: true, purged: true },
              { _id: 'task~c3~event~11', _rev: '11', _deleted: true, purged: true },
              { _id: 'task~c3~event~12', _rev: '12', _deleted: true, purged: true },
            ]],
          ]);
        });
      });
    });

    it('should throw an error when purge save is not successful', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge_tasks: [{ event_name: 'event' }] } });
      localDb.get.withArgs('org.couchdb.user:userName').resolves({ contact_id: 'user_contact' });

      const batch1 = [
        { id: 'task~event~1', value: { rev: '1' } },
        { id: 'task~event~2', value: { rev: '2' } },
        { id: 'task~event~3', value: { rev: '3' } },
        { id: 'task~event~4', value: { rev: '4' } },
      ];
      localDb.allDocs.resolves({ rows: batch1 });
      localDb.bulkDocs.resolves([{ error: true }]);

      return taskPurgerSpec.purge(localDb, userCtx)
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.message.startsWith('Not all documents purged successfully')).to.equal(true);

          chai.expect(localDb.get.callCount).to.equal(2);
          chai.expect(localDb.get.args).to.deep.equal([['settings'],['org.couchdb.user:userName']]);

          chai.expect(localDb.allDocs.callCount).to.equal(1);
          const args = {
            start_key: 'task~org.couchdb.user:userName~user_contact~event',
            end_key: 'task~org.couchdb.user:userName~user_contact~event\ufff0',
            limit: 100,
          };
          chai.expect(localDb.allDocs.args[0]).to.deep.equal([args]);

          chai.expect(localDb.bulkDocs.callCount).to.equal(1);
          chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'task~event~1', _rev: '1', _deleted: true, purged: true },
            { _id: 'task~event~2', _rev: '2', _deleted: true, purged: true },
            { _id: 'task~event~3', _rev: '3', _deleted: true, purged: true },
            { _id: 'task~event~4', _rev: '4', _deleted: true, purged: true },
          ]]);
        });
    });
  });
});
