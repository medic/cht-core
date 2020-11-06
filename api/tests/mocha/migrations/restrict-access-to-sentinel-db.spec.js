const sinon = require('sinon');
const chai = require('chai');
const request = require('request-promise-native');
const environment = require('../../../src/environment');
const migration = require('../../../src/migrations/restrict-access-to-sentinel-db');

describe('restrict-access-to-sentinel-db migration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should create migration with basic properties', () => {
    const expectedCreationDate = new Date(2020, 5, 29).toDateString();

    chai.expect(migration.name).to.equal('restrict-access-to-sentinel-db');
    chai.expect(migration.created).to.exist;
    chai.expect(migration.created.toDateString()).to.equal(expectedCreationDate);
    chai.expect(migration.run).to.be.a('function');
  });

  it('should request with the right parameters', () => {
    const putStub = sinon.stub(request, 'put').resolves();
    sinon.stub(environment, 'protocol').value('http:');
    sinon.stub(environment, 'host').value('host');
    sinon.stub(environment, 'port').value('port');
    sinon.stub(environment, 'db').returns('database');
    const url = `${environment.protocol}//${environment.host}:${environment.port}/${environment.db}-sentinel/_security`;
    const auth = {
      user: environment.username,
      pass: environment.password
    };
    const body = {
      admins: { names: [], roles: [ 'sentinel' ] },
      members: { names: [], roles: [ 'sentinel' ] }
    };

    return migration.run()
      .then(() => {
        chai.expect(putStub.callCount).to.equal(1);
        chai.expect(putStub.args[0][0].url).to.equal(url);
        chai.expect(putStub.args[0][0].auth).to.include(auth);
        chai.expect(putStub.args[0][0].body).to.deep.include(body);
        chai.expect(putStub.args[0][0].json).to.equal(true);
      });
  });

  it('should catch exceptions', () => {
    const putStub = sinon.stub(request, 'put').resolves(Promise.reject('Some Error'));
    const message = 'Failed to add security to sentinel db."Some Error"';

    return migration.run()
      .catch((error) => {
        chai.expect(putStub.callCount).to.equal(1);
        chai.expect(error.message).to.equal(message);
      });
  });
});
