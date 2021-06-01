const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const migration = require('../../../src/migrations/remove-user-language');

describe('remove-user-language migration', () => {
  afterEach(() => sinon.restore());

  it('creates migration with basic properties', () => {
    const expectedCreationDate = new Date(2021, 6, 1).toDateString();

    chai.expect(migration.name).to.equal('remove-user-language');
    chai.expect(migration.created).to.exist;
    chai.expect(migration.created.toDateString()).to.equal(expectedCreationDate);
    chai.expect(migration.run).to.be.a('function');
  });

  it('does nothing if no users', () => {
    const userQuery = sinon.stub(db.medic, 'query').resolves({ rows: [] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(1);
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('removes the language value from all the users that have it', () => {
    const userLang0 = {
      doc: {
        _id: 'org.couchdb.user:lang0',
        language: 'en'
      }
    };
    const userLang1 = {
      doc: {
        _id: 'org.couchdb.user:lang1',
        language: 'es'
      }
    };
    const userLang3 = {
      doc: {
        _id: 'org.couchdb.user:lang2',
        language: ''
      }
    };
    const userNoLang0 = {
      doc: {
        _id: 'org.couchdb.user:noLang0',
      }
    };
    const userNoLang1 = {
      doc: {
        _id: 'org.couchdb.user:noLang1',
      }
    };

    const userQuery = sinon.stub(db.medic, 'query');
    userQuery.onFirstCall().resolves({ rows: [ userLang0, userNoLang0, userLang1, userNoLang1 ] });
    userQuery.onSecondCall().resolves({ rows: [ userLang3 ] });
    userQuery.onThirdCall().resolves({ rows: [] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').returns(Promise.resolve());
    const updatedUserDocs0 = [ { _id: 'org.couchdb.user:lang0' }, { _id: 'org.couchdb.user:lang1' } ];
    const updatedUserDocs1 = [ { _id: 'org.couchdb.user:lang2' } ];

    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(3);
      chai.expect(bulkDocs.callCount).to.equal(2);
      chai.expect(bulkDocs.calledWithExactly(updatedUserDocs0)).to.be.true;
      chai.expect(bulkDocs.calledWithExactly(updatedUserDocs1)).to.be.true;
    });
  });

  it('does nothing if none of the users have a language value', () => {
    const userNoLang0 = {
      doc: {
        _id: 'org.couchdb.user:noLang0',
      }
    };
    const userNoLang1 = {
      doc: {
        _id: 'org.couchdb.user:noLang1',
      }
    };

    const userQuery = sinon.stub(db.medic, 'query');
    userQuery.onFirstCall().resolves({ rows: [ userNoLang0, userNoLang1 ] });
    userQuery.onSecondCall().resolves({ rows: [] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(2);
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('returns exception when querying', () => {
    const message = 'Some Error';
    const userQuery = sinon.stub(db.medic, 'query').returns(Promise.reject(message));

    return migration.run()
      .catch((error) => {
        chai.expect(userQuery.callCount).to.equal(1);
        chai.expect(error).to.equal(message);
      });
  });

  it('returns exception when updating', () => {
    const user = {
      doc: {
        _id: 'org.couchdb.user:0',
        language: 'en'
      }
    };

    const message = 'Some Error';
    const userQuery = sinon.stub(db.medic, 'query');
    userQuery.onFirstCall().resolves({ rows: [ user ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').returns(Promise.reject(message));    

    return migration.run()
      .catch((error) => {
        chai.expect(userQuery.callCount).to.equal(1);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(error).to.equal(message);
      });
  });
});
