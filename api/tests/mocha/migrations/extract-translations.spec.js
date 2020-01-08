const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const settingsService = require('../../../src/services/settings');
const migration = require('../../../src/migrations/extract-translations');

describe('extract-translations migration', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('returns errors from getSettings', done => {
    const getSettings = sinon.stub(settingsService, 'get').returns(Promise.reject('boom'));
    migration.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(getSettings.callCount).to.equal(1);
      done();
    });
  });

  it('does nothing if no configured translations', () => {
    const translations = [];
    const locales = [];
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query');
    const bulk = sinon.stub(db.medic, 'bulkDocs');
    return migration.run().then(() => {
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(0);
      chai.expect(bulk.callCount).to.equal(0);
    });
  });

  it('returns errors from view', done => {
    const translations = [
      { key: 'hello', default: 'Hi', translations: [
        { locale: 'en', content: 'Hello' },
        { locale: 'es', content: 'Hola' }
      ] },
      { key: 'bye', default: 'Bye', translations: [
        { locale: 'en', content: 'Goodbye' }
      ] }
    ];
    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' }
    ];
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').returns(Promise.reject('boom'));
    const bulk = sinon.stub(db.medic, 'bulkDocs');
    migration.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(bulk.callCount).to.equal(0);
      done();
    });
  });

  it('does nothing if no docs', () => {
    // should only happen if a configurer has deleted all the docs...
    const translations = [
      { key: 'hello', default: 'Hi', translations: [
        { locale: 'en', content: 'Hello' },
        { locale: 'es', content: 'Hola' }
      ] },
      { key: 'bye', default: 'Bye', translations: [
        { locale: 'en', content: 'Goodbye' }
      ] }
    ];
    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' }
    ];
    const docs = { rows: [] };
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').resolves(docs);
    const bulk = sinon.stub(db.medic, 'bulkDocs');
    const updateSettings = sinon.stub(settingsService, 'update').resolves();
    return migration.run().then(() => {
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(bulk.callCount).to.equal(0);
      chai.expect(updateSettings.callCount).to.equal(1);
      chai.expect(updateSettings.args[0][0].translations).to.equal(null);
      chai.expect(updateSettings.args[0][0].locales).to.equal(null);
    });
  });

  it('returns errors from bulk', done => {
    const translations = [
      { key: 'hello', default: 'Hi', translations: [
        { locale: 'en', content: 'Hello' },
        { locale: 'es', content: 'Hola' }
      ] },
      { key: 'bye', default: 'Bye', translations: [
        { locale: 'en', content: 'Goodbye' }
      ] }
    ];
    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' }
    ];
    const docs = { rows: [
      { doc: {
        _id: 'messages-en',
        _rev: '4-f052fe152cd3989aa14dd80f4267607c',
        type: 'translations',
        code: 'en',
        name: 'English',
        enabled: true,
        values: {
          hello: 'Hey'
        }
      } }
    ] };
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').resolves(docs);
    const bulk = sinon.stub(db.medic, 'bulkDocs').returns(Promise.reject('boom'));
    const updateSettings = sinon.stub(settingsService, 'update');
    migration.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(bulk.callCount).to.equal(1);
      chai.expect(updateSettings.callCount).to.equal(0);
      done();
    });
  });

  it('returns errors from settings update', done => {
    const translations = [
      { key: 'hello', default: 'Hi', translations: [
        { locale: 'en', content: 'Hello' },
        { locale: 'es', content: 'Hola' }
      ] },
      { key: 'bye', default: 'Bye', translations: [
        { locale: 'en', content: 'Goodbye' }
      ] }
    ];
    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' }
    ];
    const docs = { rows: [
      { doc: {
        _id: 'messages-en',
        _rev: '4-f052fe152cd3989aa14dd80f4267607c',
        type: 'translations',
        code: 'en',
        name: 'English',
        enabled: true,
        values: {
          hello: 'Hey'
        }
      } }
    ] };
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').resolves(docs);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    const updateSettings = sinon.stub(settingsService, 'update').returns(Promise.reject('boom'));
    migration.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(bulk.callCount).to.equal(1);
      chai.expect(updateSettings.callCount).to.equal(1);
      done();
    });
  });

  it('merges configuration into docs', () => {
    const translations = [
      { key: 'hello', default: 'Hi', translations: [
        { locale: 'en', content: 'Hello configured' },
        { locale: 'es', content: 'Hola configured' }
      ] },
      { key: 'bye', default: 'Bye', translations: [
        { locale: 'en', content: 'Goodbye configured' }
      ] }
    ];
    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)', disabled: true }
    ];
    const docs = { rows: [
      { doc: {
        _id: 'messages-en',
        _rev: '4-f052fe152cd3989aa14dd80f4267607c',
        type: 'translations',
        code: 'en',
        name: 'English',
        enabled: true,
        values: {
          hello: 'Hey',
          welcome: 'Welcome'
        }
      } },
      { doc: {
        _id: 'messages-es',
        _rev: '4-f052fe152cd3989aa14dd80f4267607c',
        type: 'translations',
        code: 'es',
        name: 'Spanish',
        enabled: true,
        values: {
          hello: 'Howdy',
          welcome: 'Salut'
        }
      } },
      { doc: {
        _id: 'messages-fr',
        _rev: '4-f052fe152cd3989aa14dd80f4267607c',
        type: 'translations',
        code: 'fr',
        name: 'French',
        enabled: true,
        values: {
          hello: 'Yo'
        }
      } }
    ] };
    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').resolves(docs);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    const updateSettings = sinon.stub(settingsService, 'update').resolves();
    return migration.run().then(() => {
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(view.args[0][0]).to.equal('medic-client/doc_by_type');
      chai.expect(view.args[0][1].key[0]).to.equal('translations');
      chai.expect(view.args[0][1].key[1]).to.equal(true);
      chai.expect(view.args[0][1].include_docs).to.equal(true);
      chai.expect(bulk.callCount).to.equal(1);
      chai.expect(bulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          _rev: '4-f052fe152cd3989aa14dd80f4267607c',
          type: 'translations',
          code: 'en',
          name: 'English',
          enabled: true,
          values: {
            hello: 'Hello configured',
            bye: 'Goodbye configured',
            welcome: 'Welcome'
          }
        },
        {
          _id: 'messages-es',
          _rev: '4-f052fe152cd3989aa14dd80f4267607c',
          type: 'translations',
          code: 'es',
          name: 'Spanish',
          enabled: false,
          values: {
            hello: 'Hola configured',
            welcome: 'Salut'
          }
        },
        {
          _id: 'messages-fr',
          _rev: '4-f052fe152cd3989aa14dd80f4267607c',
          type: 'translations',
          code: 'fr',
          name: 'French',
          enabled: true,
          values: {
            hello: 'Yo'
          }
        }
      ]);
      chai.expect(updateSettings.callCount).to.equal(1);
      chai.expect(updateSettings.args[0][0].translations).to.equal(null);
      chai.expect(updateSettings.args[0][0].locales).to.equal(null);
    });
  });

  it('merges configuration into docs for all translations structures', () => {
    const translations = [
      {
        key: 'hello',
        default: 'Hi',
        translations: [
          { locale: 'en', content: 'Hello configured' },
          { locale: 'es', content: 'Hola configured' },
          { locale: 'fr', content: 'Salut configured' },
          { locale: 'de', content: 'Hallo configured' }
        ]
      }
    ];

    const locales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' },
      { code: 'fr', name: 'Français (French)' },
      { code: 'de', name: 'Deutsche (German)' },
    ];

    const docs = [
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        name: 'English',
        enabled: true,
        values: {
          hello: 'Hi',
          welcome: 'Welcome'
        }
      },
      {
        _id: 'messages-es',
        type: 'translations',
        code: 'es',
        name: 'Spanish',
        enabled: true,
        generic: {
          hello: 'Hola',
          welcome: 'Bienvenito'
        }
      },
      {
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        name: 'French',
        enabled: true,
        values: {
          hello: 'Salut'
        },
        generic: {
          welcome: 'Bienvenue'
        }
      },
      {
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        name: 'Deutsche (German)',
        enabled: true,
        generic: {
          hello: 'Hallo'
        },
        custom: {
          welcome: 'Willkommen'
        }
      }
    ];

    const getSettings = sinon.stub(settingsService, 'get').resolves({ translations: translations, locales: locales });
    const view = sinon.stub(db.medic, 'query').resolves({ rows: docs.map(doc => ({ doc })) });
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    const updateSettings = sinon.stub(settingsService, 'update').resolves();
    return migration.run().then(() => {
      chai.expect(getSettings.callCount).to.equal(1);
      chai.expect(view.callCount).to.equal(1);
      chai.expect(view.args[0][0]).to.equal('medic-client/doc_by_type');
      chai.expect(view.args[0][1].key[0]).to.equal('translations');
      chai.expect(view.args[0][1].key[1]).to.equal(true);
      chai.expect(view.args[0][1].include_docs).to.equal(true);
      chai.expect(bulk.callCount).to.equal(1);
      chai.expect(bulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          type: 'translations',
          code: 'en',
          name: 'English',
          enabled: true,
          values: {
            hello: 'Hello configured',
            welcome: 'Welcome'
          }
        },
        {
          _id: 'messages-es',
          type: 'translations',
          code: 'es',
          name: 'Spanish',
          enabled: true,
          generic: {
            hello: 'Hola configured',
            welcome: 'Bienvenito'
          }
        },
        {
          _id: 'messages-fr',
          type: 'translations',
          code: 'fr',
          name: 'French',
          enabled: true,
          values: {
            hello: 'Salut configured'
          },
          generic: {
            welcome: 'Bienvenue'
          }
        },
        {
          _id: 'messages-de',
          type: 'translations',
          code: 'de',
          name: 'Deutsche (German)',
          enabled: true,
          generic: {
            hello: 'Hallo configured'
          },
          custom: {
            welcome: 'Willkommen'
          }
        }
      ]);
      chai.expect(updateSettings.callCount).to.equal(1);
      chai.expect(updateSettings.args[0][0].translations).to.equal(null);
      chai.expect(updateSettings.args[0][0].locales).to.equal(null);
    });
  });

});
