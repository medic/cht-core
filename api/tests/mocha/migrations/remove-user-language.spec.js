const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const migration = require('../../../src/migrations/remove-user-language');

const docByType = 'medic-client/doc_by_type';
let userQuery;
let bulkDocs;
let expectedOptions;

describe('remove-user-language migration', () => {
  beforeEach(() => {
    userQuery = sinon.stub(db.medic, 'query');
    bulkDocs = sinon.stub(db.medic, 'bulkDocs');
    expectedOptions = {
      include_docs: true,
      limit: 100,
      skip: 0,
      key: [ 'user-settings' ]
    };
  });

  afterEach(() => sinon.restore());

  it('should have basic properties', () => {
    const expectedCreationDate = new Date(2021, 6, 1).toDateString();

    chai.expect(migration.name).to.equal('remove-user-language');
    chai.expect(migration.created).to.exist;
    chai.expect(migration.created.toDateString()).to.equal(expectedCreationDate);
    chai.expect(migration.run).to.be.a('function');
  });

  it('should do nothing if there are no users', () => {
    userQuery.resolves({ rows: [] });
    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(1);
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('should remove the language value from all the users that have it', () => {
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
        language: null
      }
    };
    const userNoLang0 = {
      doc: {
        _id: 'org.couchdb.user:noLang0',
      }
    };
    const userNoLang1 = { };

    userQuery.onFirstCall().resolves({ rows: [ userLang0, userNoLang0, userLang1, userNoLang1 ] });
    userQuery.onSecondCall().resolves({ rows: [ userLang3 ] });
    userQuery.onThirdCall().resolves({ });
    bulkDocs.resolves();

    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(3);
      chai.expect(userQuery.args[0]).to.deep.equal([docByType, expectedOptions]);
      expectedOptions.skip = 100;
      chai.expect(userQuery.args[1]).to.deep.equal([docByType, expectedOptions]);
      expectedOptions.skip = 200;
      chai.expect(userQuery.args[2]).to.deep.equal([docByType, expectedOptions]);
      chai.expect(bulkDocs.callCount).to.equal(2);
      chai.expect(bulkDocs.args[0])
        .to.deep.equal([[ { _id: 'org.couchdb.user:lang0' }, { _id: 'org.couchdb.user:lang1' } ]]);
      chai.expect(bulkDocs.args[1]).to.deep.equal([[ { _id: 'org.couchdb.user:lang2' } ]]);
    });
  });

  it('should do nothing if none of the users have a language value', () => {
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

    userQuery.onFirstCall().resolves({ rows: [ userNoLang0, userNoLang1 ] });
    userQuery.onSecondCall().resolves({ rows: [] });

    return migration.run().then(() => {
      chai.expect(userQuery.callCount).to.equal(2);
      chai.expect(userQuery.args[0]).to.deep.equal([ docByType, expectedOptions ]);
      expectedOptions.skip = 100;
      chai.expect(userQuery.args[1]).to.deep.equal([ docByType, expectedOptions ]);
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('should throw an error if one occurs when querying', () => {
    const message = 'Some Error';
    userQuery.rejects(message);

    return migration
      .run()
      .then(() => chai.assert.fail('should have thrown'))
      .catch((error) => {
        chai.expect(userQuery.callCount).to.equal(1);
        chai.expect(userQuery.args[0]).to.deep.equal([ docByType, expectedOptions ]);
        chai.expect(error.name).to.equal(message);
      });
  });

  it('should throw an error if one occurs when updating', () => {
    const user = {
      doc: {
        _id: 'org.couchdb.user:0',
        language: 'en'
      }
    };

    const message = 'Some Error';
    userQuery.onFirstCall().resolves({ rows: [ user ] });
    bulkDocs.returns(Promise.reject(message));    

    return migration
      .run()
      .then(() => chai.assert.fail('should have thrown'))
      .catch((error) => {
        chai.expect(userQuery.callCount).to.equal(1);
        chai.expect(userQuery.args[0]).to.deep.equal([ docByType, expectedOptions ]);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(bulkDocs.args[0]).to.deep.equal([[ { _id: 'org.couchdb.user:0' } ]]);
        chai.expect(error).to.equal(message);
      });
  });
});
