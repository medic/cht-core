const chai = require('chai');
const sinon = require('sinon');
const db = require('../../src/db');
const translationUtils = require('@medic/translation-utils');
const transitions = require('../../src/transitions');

const rewire = require('rewire');
const expect = chai.expect;

describe('config', () => {
  beforeEach(() => {
    // Ensure modules are re-required with stubs
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    sinon.stub(db.medic, 'get').resolves({ _id: 'settings', settings: {} });
    sinon.stub(db.medic, 'changes').returns({
      on: function(event, handler) {
        this['on_' + event] = handler;
        return this;
      },
    });

    sinon.stub(translationUtils, 'loadTranslations').returnsArg(0);
    sinon.stub(transitions, 'loadTransitions').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('get/getAll return defaults before init', () => {
    const config = rewire('../../../sentinel/src/config');
    const all = config.getAll();
    expect(all.loglevel).to.equal('info');
    expect(config.get('schedule_morning_hours')).to.equal(0);
  });

  it('init() loads translations then config and starts feed', async () => {
    const config = rewire('../../../sentinel/src/config');
    config.__set__('initTransitionLib', sinon.stub());

    await config.init();

    expect(db.medic.changes.calledOnce).to.be.true;
    const changes = db.medic.changes.returnValues[0];
    expect(changes).to.be.an('object');

    expect(db.medic.query.calledOnce).to.be.true;
    expect(db.medic.query.firstCall.args).to.deep.equal([
      'medic-client/doc_by_type',
      {
        key: ['translations'],
        include_docs: true,
      }
    ]);
    expect(db.medic.get.calledOnceWith('settings')).to.be.true;
  });

  it('initConfig applies defaults and logs schedule', async () => {
    const config = rewire('../../../sentinel/src/config');
    db.medic.get.resolves({ _id: 'settings', settings: { loglevel: 'debug' } });

    await config.init();
    const current = config.getAll();
    expect(current.schedule_evening_hours).to.equal(23);
  });

  it('loadTranslations populates translations store', async () => {
    const config = rewire('../../../sentinel/src/config');
    db.medic.query.resolves({ rows: [
      { doc: { code: 'en', generic: { a: 'A' } } },
      { doc: { code: 'fr', generic: { hello: 'Bonjour' }, custom: { bye: 'Au revoir' } } },
    ]});

    await config.init();

    const tr = config.getTranslations();
    expect(tr.en).to.deep.equal({ a: 'A' });
    expect(tr.fr).to.deep.equal({ hello: 'Bonjour', bye: 'Au revoir' });
    expect(translationUtils.loadTranslations.calledTwice).to.be.true;
  });

  it('initFeed reacts to changes for settings and translations', async () => {
    const config = rewire('../../../sentinel/src/config');
    await config.init();
    const changes = db.medic.changes.returnValues[0];

    // settings change
    changes.on_change({ id: 'settings' });

    // messages change triggers translations reload then initTransitionLib
    db.medic.query.resetHistory();
    changes.on_change({ id: 'messages-fr' });
    // allow microtasks to flush
    await new Promise(res => setImmediate(res));
    expect(db.medic.query.calledOnce).to.be.true;
  });

  it('initFeed error logs and exits process', async () => {
    const config = rewire('../../../sentinel/src/config');
    const exitStub = sinon.stub(process, 'exit');
    await config.init();
    const changes = db.medic.changes.returnValues[0];
    changes.on_error(new Error('boom'));
    expect(exitStub.calledWith(1)).to.be.true;
    exitStub.restore();
  });

  it('initConfig logs and throws on error', async () => {
    const config = rewire('../../../sentinel/src/config');
    db.medic.get.rejects(new Error('no settings'));
    try {
      await config.init();
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.equal('Error loading configuration');
    }
  });
});
