var sinon = require('sinon'),
    db = require('../../db'),
    utils = require('../utils'),
    migration = require('../../migrations/extract-translations');

exports.tearDown = function (callback) {
  utils.restore(db.getSettings, db.updateSettings, db.medic.view, db.medic.bulk);
  db.settings = {};
  callback();
};

exports['returns errors from getSettings'] = function(test) {
  test.expect(2);
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, 'boom');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.done();
  });
};

exports['does nothing if no configured translations'] = function(test) {
  test.expect(4);
  var translations = [];
  var locales = [];
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view');
  var bulk = sinon.stub(db.medic, 'bulk');
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 0);
    test.equals(bulk.callCount, 0);
    test.done();
  });
};

exports['returns errors from view'] = function(test) {
  test.expect(4);
  var translations = [
    { key: 'hello', default: 'Hi', translations: [
      { locale: 'en', content: 'Hello' },
      { locale: 'es', content: 'Hola' }
    ] },
    { key: 'bye', default: 'Bye', translations: [
      { locale: 'en', content: 'Goodbye' }
    ] }
  ];
  var locales = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' }
  ];
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, 'boom');
  var bulk = sinon.stub(db.medic, 'bulk');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 1);
    test.equals(bulk.callCount, 0);
    test.done();
  });
};

exports['does nothing if no docs'] = function(test) {
  // should only happen if a configurer has deleted all the docs...
  test.expect(7);
  var translations = [
    { key: 'hello', default: 'Hi', translations: [
      { locale: 'en', content: 'Hello' },
      { locale: 'es', content: 'Hola' }
    ] },
    { key: 'bye', default: 'Bye', translations: [
      { locale: 'en', content: 'Goodbye' }
    ] }
  ];
  var locales = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' }
  ];
  var docs = { rows: [] };
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, docs);
  var bulk = sinon.stub(db.medic, 'bulk');
  var updateSettings = sinon.stub(db, 'updateSettings').callsArgWith(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 1);
    test.equals(bulk.callCount, 0);
    test.equals(updateSettings.callCount, 1);
    test.strictEqual(updateSettings.args[0][0].translations, null);
    test.strictEqual(updateSettings.args[0][0].locales, null);
    test.done();
  });
};

exports['returns errors from bulk'] = function(test) {
  test.expect(5);
  var translations = [
    { key: 'hello', default: 'Hi', translations: [
      { locale: 'en', content: 'Hello' },
      { locale: 'es', content: 'Hola' }
    ] },
    { key: 'bye', default: 'Bye', translations: [
      { locale: 'en', content: 'Goodbye' }
    ] }
  ];
  var locales = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' }
  ];
  var docs = { rows: [
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
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, docs);
  var bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, 'boom');
  var updateSettings = sinon.stub(db, 'updateSettings');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 1);
    test.equals(bulk.callCount, 1);
    test.equals(updateSettings.callCount, 0);
    test.done();
  });
};

exports['returns errors from settings update'] = function(test) {
  test.expect(5);
  var translations = [
    { key: 'hello', default: 'Hi', translations: [
      { locale: 'en', content: 'Hello' },
      { locale: 'es', content: 'Hola' }
    ] },
    { key: 'bye', default: 'Bye', translations: [
      { locale: 'en', content: 'Goodbye' }
    ] }
  ];
  var locales = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' }
  ];
  var docs = { rows: [
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
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, docs);
  var bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  var updateSettings = sinon.stub(db, 'updateSettings').callsArgWith(1, 'boom');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 1);
    test.equals(bulk.callCount, 1);
    test.equals(updateSettings.callCount, 1);
    test.done();
  });
};

exports['merges configuration into docs'] = function(test) {
  test.expect(12);
  var translations = [
    { key: 'hello', default: 'Hi', translations: [
      { locale: 'en', content: 'Hello configured' },
      { locale: 'es', content: 'Hola configured' }
    ] },
    { key: 'bye', default: 'Bye', translations: [
      { locale: 'en', content: 'Goodbye configured' }
    ] }
  ];
  var locales = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)', disabled: true }
  ];
  var docs = { rows: [
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
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { translations: translations, locales: locales } });
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, docs);
  var bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  var updateSettings = sinon.stub(db, 'updateSettings').callsArgWith(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getSettings.callCount, 1);
    test.equals(view.callCount, 1);
    test.equals(view.args[0][0], 'medic');
    test.equals(view.args[0][1], 'doc_by_type');
    test.equals(view.args[0][2].key[0], 'translations');
    test.equals(view.args[0][2].include_docs, true);
    test.equals(bulk.callCount, 1);
    test.deepEqual(bulk.args[0][0].docs, [
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
    test.equals(updateSettings.callCount, 1);
    test.strictEqual(updateSettings.args[0][0].translations, null);
    test.strictEqual(updateSettings.args[0][0].locales, null);
    test.done();
  });
};
