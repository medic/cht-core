const service = require('../../../src/services/user-db'),
      db = require('../../../src/db-nano'),
      chai = require('chai'),
      sinon = require('sinon');

describe('User DB service', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('getDbName creates the user db name', () => {
    const given = 'jimbob';
    const expected = 'medic-user-jimbob-meta';
    const actual = service.getDbName(given);
    chai.expect(actual).to.equal(expected);
  });

  it('getDbName escapes invalid characters - #3778', () => {
    // Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
    const valid   = 'abc123_$()+-/';
    const invalid = '.<>^,?!';
    const escaped = '(46)(60)(62)(94)(44)(63)(33)';
    const given   = valid + invalid;
    const expected = `medic-user-${valid + escaped}-meta`;
    const actual = service.getDbName(given);
    chai.expect(actual).to.equal(expected);
  });

  it('creates the db', done => {
    const create = sinon.stub(db.db, 'create').callsArgWith(1);
    const request = sinon.stub(db, 'request').callsArgWith(1);
    const insert = sinon.stub().callsArgWith(1);
    const use = sinon.stub(db, 'use').returns({ insert: insert });
    service.create('gareth', err => {
      chai.expect(err).to.equal(null);
      chai.expect(create.args[0][0]).to.equal('medic-user-gareth-meta');
      chai.expect(request.callCount).to.equal(1);
      const requestParams = request.args[0][0];
      chai.expect(requestParams.db).to.equal('medic-user-gareth-meta');
      chai.expect(requestParams.path).to.equal('/_security');
      chai.expect(requestParams.method).to.equal('PUT');
      chai.expect(requestParams.body.admins.names[0]).to.equal('gareth');
      chai.expect(use.callCount).to.equal(1);
      chai.expect(use.args[0][0]).to.equal('medic-user-gareth-meta');
      chai.expect(insert.callCount).to.equal(1);
      const ddoc = insert.args[0][0];
      chai.expect(ddoc._id).to.equal('_design/medic-user');
      chai.expect(ddoc.views.read.map).to.equal('function (doc) {\n  var parts = doc._id.split(\':\');\n  if (parts[0] === \'read\') {\n    emit(parts[1]);\n  }\n}');
      chai.expect(ddoc.views.read.reduce).to.equal('_count');
      done();
    });
  });

});
