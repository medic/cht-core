const service = require('../../../src/services/user-db');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const request = require('request-promise-native');
const chai = require('chai');
const sinon = require('sinon');

describe('User DB service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('getDbName', () => {

    it('returns the user db name', () => {
      const given = 'jimbob';
      const expected = `${environment.db}-user-jimbob-meta`;
      const actual = service.getDbName(given);
      chai.expect(actual).to.equal(expected);
    });

    it('escapes invalid characters - #3778', () => {
      // Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
      const valid   = 'abc123_$()+-/';
      const invalid = '.<>^,?!';
      const escaped = '(46)(60)(62)(94)(44)(63)(33)';
      const given   = valid + invalid;
      const expected = `${environment.db}-user-${valid + escaped}-meta`;
      const actual = service.getDbName(given);
      chai.expect(actual).to.equal(expected);
    });

  });

  describe('create', () => {

    it('does nothing if the db already exists', () => {
      const userDb = { close: sinon.stub() };
      sinon.stub(db, 'exists').resolves(userDb);
      sinon.stub(db, 'close');
      return service.create('gareth').then(() => {
        chai.expect(db.close.callCount).to.equal(1);
        chai.expect(db.close.args[0]).to.deep.equal([userDb]);
      });
    });

    it('creates the db if it does not exist', () => {
      const userDb = { put: function() {} };
      const create = sinon.stub(db, 'exists').resolves(false);
      sinon.stub(db, 'close');
      const get = sinon.stub(db, 'get').returns(userDb);
      const dbPut = sinon.stub(userDb, 'put').resolves();
      const requestPut = sinon.stub(request, 'put').resolves();
      environment.protocol = 'http:';
      environment.host = 'localhost';
      environment.port = '7357';
      environment.username = 'auser';
      environment.password = 'apass';
      return service.create('gareth').then(() => {
        chai.expect(create.args[0][0]).to.equal(`${environment.db}-user-gareth-meta`);
        chai.expect(get.callCount).to.equal(1);
        const requestParams = requestPut.args[0][0];
        chai.expect(requestParams.url).to.equal(`http://localhost:7357/${environment.db}-user-gareth-meta/_security`);
        chai.expect(requestParams.auth).to.deep.equal({ user: 'auser', pass: 'apass' });
        chai.expect(requestParams.json).to.equal(true);
        chai.expect(requestParams.body.admins.names[0]).to.equal('gareth');
        chai.expect(requestParams.body.members.names[0]).to.equal('gareth');
        chai.expect(dbPut.callCount).to.equal(1);
        const ddoc = dbPut.args[0][0];
        chai.expect(ddoc).to.have.all.keys('_id', 'views', 'validate_doc_update');
        chai.expect(ddoc._id).to.equal('_design/medic-user');
        chai.expect(ddoc.views.read.map).to.equal(
          'function (doc) {\n  var parts = doc._id.split(\':\');\n  if (parts[0] === \'read\') ' +
          '{\n    emit(parts[1]);\n  }\n}'
        );
        chai.expect(ddoc.views.read.reduce).to.equal('_count');
        chai.expect(ddoc.validate_doc_update).to.equal(
          'function (newDoc) {\n  if (newDoc && newDoc._deleted && newDoc.purged) {\n    ' +
          'throw ({forbidden: \'Purged documents should not be written to CouchDB!\'});\n  }\n}'
        );
        chai.expect(db.close.callCount).to.equal(1);
        chai.expect(db.close.args[0]).to.deep.equal([userDb]);
      });
    });

    it('should close the db even with errors', () => {
      sinon.stub(db, 'exists').resolves(false);
      const userDb = {
        close: sinon.stub(),
        put: sinon.stub().rejects({ err: 'boom' }),
      };
      sinon.stub(db, 'get').returns(userDb);
      sinon.stub(db, 'close');
      return service
        .create('gareth')
        .then(r => chai.expect(r).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ err: 'boom' });
          chai.expect(userDb.put.callCount).to.equal(1);
          chai.expect(db.close.callCount).to.equal(1);
          chai.expect(db.close.args[0]).to.deep.equal([userDb]);
        });
    });
  });

  describe('validateDocUpdate', () => {
    it('should not throw an error for non-purge deletes', () => {
      chai.expect(service.validateDocUpdate.bind(service, {})).not.to.throw();
      chai.expect(service.validateDocUpdate.bind(service, { _id: 'test', _deleted: true })).not.to.throw();
      chai.expect(service.validateDocUpdate.bind(service, { _id: 'test', some: 'thing' })).not.to.throw();
      chai.expect(service.validateDocUpdate.bind(service, { _id: 'test', _purged: true })).not.to.throw();
      chai.expect(service.validateDocUpdate.bind(service, { _id: 'test', purged: true })).not.to.throw();
    });

    it('should throw an error for purge deletes', () => {
      chai.expect(service.validateDocUpdate.bind(service, { _id: 'test', purged: true, _deleted: true })).to.throw();
    });
  });

  describe('isDbName', () => {
    it('should return true for matching db names', () => {
      chai.expect(service.isDbName(`${environment.db}-user-something-meta`)).to.equal(true);
      chai.expect(service.isDbName(`${environment.db}-user-1233$$--+++!!!-meta`)).to.equal(true);
      chai.expect(service.isDbName(`${environment.db}-user-medic-meta`)).to.equal(true);
    });

    it('should return false for not matching db names', () => {
      chai.expect(service.isDbName(`${environment.db}`)).to.equal(false);
      chai.expect(service.isDbName(`${environment.db}-sentinel`)).to.equal(false);
      chai.expect(service.isDbName(`${environment.db}-users-meta`)).to.equal(false);
      chai.expect(service.isDbName(`medic-users-meta`)).to.equal(false);
      chai.expect(service.isDbName('some-other-db')).to.equal(false);
    });
  });

});
