const sinon = require('sinon');
const { expect } = require('chai');
const rpn = require('request-promise-native');
const config = require('../../../src/config');
const environment = require('../../../src/environment');
const transition = require('../../../src/transitions/user_replace');

const originalApiUrl = environment.apiUrl;

const REPLACE_USER_DOC = {
  _id: 'replace_user_id',
  form: 'replace_user'
};

describe('user_replace', () => {
  before(() => environment.apiUrl = 'https://my.cht.instance');
  afterEach(() => sinon.restore());
  after(() => environment.apiUrl = originalApiUrl);

  it('init succeeds if token_login is enabled', () => {
    config.get = sinon.stub().returns({ enabled: true });

    expect(() => transition.init()).to.not.throw();
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('init fails if token_login is not enabled', () => {
    config.get = sinon.stub().returns({ enabled: false });

    expect(() => transition.init()).to
      .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('init fails if token_login config does not exist', () => {
    config.get = sinon.stub().returns(undefined);

    expect(() => transition.init()).to
      .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('filter includes replace_user form doc', () => {
    expect(transition.filter(REPLACE_USER_DOC)).to.be.true;
  });

  it('filter excludes docs which are not from the replace_user form', () => {
    const doc = { form: 'death_report' };

    expect(transition.filter(doc)).to.be.false;
  });

  it('filter excludes docs for which the transition has already run', () => {
    const info = { transitions: { user_replace: true } };

    expect(transition.filter(REPLACE_USER_DOC, info)).to.be.false;
  });

  it('match succeeds when the user-replace api call returns successfully', () => {
    rpn.post = sinon.stub().resolves();

    return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
      expect(result).to.be.true;
      expect(rpn.post.callCount).to.equal(1);
      expect(rpn.post.args[0][0]).to.deep.include({
        body: {
          reportId: REPLACE_USER_DOC._id
        },
        json: true,
        url: `${environment.apiUrl}/api/v1/user-replace`
      });
    });
  });

  it('match errors when the user-replace api call fails', () => {
    rpn.post = sinon.stub().rejects({ message: 'something went wrong' });

    return transition.onMatch({ doc: REPLACE_USER_DOC }).catch(err => {
      expect(err.message).to.equal('something went wrong');
      expect(err.changed).to.be.true;
    });
  });
});
