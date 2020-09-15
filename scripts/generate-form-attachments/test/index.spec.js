const chai = require('chai');
const sinon = require('sinon');
const url = require('url');

describe('index', () => {
  it('should crash when no COUCH_URL', () => {
    try {
      require('../src/index');
      chai.expect(2).to.equal(3);
    } catch (err) {
      chai.expect(err.message).to.equal('Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/yourdb)');
    }
  });

  it('should crash when no authentication in couchURL', () => {
    process.env = { COUCH_URL: 'http://localhost:5984/yourdb' };
    try {
      require('../src/index');
      chai.expect(2).to.equal(3);
    } catch (err) {
      chai.expect(err.message).to.equal('COUCH_URL must contain admin authentication information');
    }
  });

  it('should call createAttachments with the parsed url', () => {
    process.env = { COUCH_URL: 'http://your:pass@localhost:5984/yourdb' };
    const parsed = url.parse(process.env.COUCH_URL);
    const createAttachments = require('../src/create-attachments');
    sinon.stub(createAttachments, 'create');

    require('../src/index');

    chai.expect(createAttachments.create.callCount).to.equal(1);
    chai.expect(createAttachments.create.args[0]).to.deep.equal([parsed, false]);
  });
});
