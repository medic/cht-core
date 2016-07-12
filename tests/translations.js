var sinon = require('sinon'),
    properties = require('properties'),
    utils = require('./utils'),
    db = require('../db'),
    translations = require('../translations');

exports.tearDown = function (callback) {
  utils.restore(
    properties.parse,
    db.medic.get,
    db.medic.attachment.get,
    db.medic.view,
    db.medic.bulk
  );
  callback();
};

exports['run returns errors from get ddoc'] = function(test) {
  test.expect(2);
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.equals(dbGet.args[0][0], '_design/medic');
    test.done();
  });
};

exports['run does nothing if no attachments'] = function(test) {
  test.expect(2);
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
  var dbAttachment = sinon.stub(db.medic.attachment, 'get');
  translations.run(function() {
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 0);
    test.done();
  });
};

exports['run does nothing if no translation attachments'] = function(test) {
  test.expect(2);
  var ddoc = { _attachments: [ { 'logo.png': {} } ] };
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get');
  translations.run(function() {
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 0);
    test.done();
  });
};

exports['run returns errors from getting attachment'] = function(test) {
  test.expect(5);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, 'boom');
  translations.run(function(err) {
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(dbAttachment.args[0][0], '_design/medic');
    test.equals(dbAttachment.args[0][1], 'translations/messages-en.properties');
    test.equals(err, 'boom');
    test.done();
  });
};

exports['run returns errors from properties parse'] = function(test) {
  test.expect(5);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(parse.args[0][0], 'some buffer');
    test.done();
  });
};

exports['run returns errors from getting backup files'] = function(test) {
  test.expect(9);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
  var dbView = sinon.stub(db.medic, 'view').callsArgWith(3, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 1);
    test.equals(dbView.args[0][0], 'medic-client');
    test.equals(dbView.args[0][1], 'doc_by_type');
    test.equals(dbView.args[0][2].key[0], 'translations-backup');
    test.equals(dbView.args[0][2].include_docs, true);
    test.done();
  });
};

exports['run returns errors from getting translations files'] = function(test) {
  test.expect(12);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var backups = [ { doc: { _id: 'messages-en-backup', values: { hello: 'Hello' } } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.equals(dbView.args[1][0], 'medic-client');
    test.equals(dbView.args[1][1], 'doc_by_type');
    test.equals(dbView.args[1][2].startkey[0], 'translations');
    test.equals(dbView.args[1][2].startkey[1], false);
    test.equals(dbView.args[1][2].endkey[0], 'translations');
    test.equals(dbView.args[1][2].endkey[1], true);
    test.equals(dbView.args[1][2].include_docs, true);
    test.done();
  });
};

exports['does nothing if translation unchanged'] = function(test) {
  test.expect(5);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var backups = [ { doc: {
    _id: 'messages-en-backup',
    code: 'en',
    type: 'translations-backup',
    values: { hello: 'Hello' }
  } } ];
  var docs = [ { doc: {
    _id: 'messages-en',
    code: 'en',
    type: 'translations',
    values: { hello: 'Gidday' }
  } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.done();
  });
};

exports['returns errors from db bulk'] = function(test) {
  test.expect(6);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var backups = [ { doc: {
    _id: 'messages-en-backup',
    code: 'en',
    type: 'translations-backup',
    values: { hello: 'Hello', bye: 'Goodbye' }
  } } ];
  var docs = [ { doc: {
    _id: 'messages-en',
    code: 'en',
    type: 'translations',
    values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
  } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.equals(dbBulk.callCount, 1);
    test.done();
  });
};

exports['merges updated translations where not modified by configuration'] = function(test) {
  test.expect(7);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var backups = [ { doc: {
    _id: 'messages-en-backup',
    code: 'en',
    type: 'translations-backup',
    values: { hello: 'Hello', bye: 'Goodbye' }
  } } ];
  var docs = [ { doc: {
    _id: 'messages-en',
    code: 'en',
    type: 'translations',
    values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
  } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED', empty: null });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.equals(dbBulk.callCount, 1);
    test.deepEqual(dbBulk.args[0][0], { docs: [
      { // merged translations doc
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: {
          hello: 'Hello UPDATED',
          bye: 'Goodbye CUSTOMISED',
          added: 'ADDED',
          empty: null
        }
      },
      { // updated backup doc
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        values: {
          hello: 'Hello UPDATED',
          bye: 'Goodbye UPDATED',
          added: 'ADDED',
          empty: null
        }
      }
    ] });
    test.done();
  });
};

exports['do not update if existing and attached translation is null'] = function(test) {
  // this is a special case broken by checking falsey
  test.expect(2);
  var ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
  var backups = [ { doc: {
    _id: 'messages-en-backup',
    code: 'en',
    type: 'translations-backup',
    values: { empty: null }
  } } ];
  var docs = [ { doc: {
    _id: 'messages-en',
    code: 'en',
    type: 'translations',
    values: { empty: null }
  } } ];
  sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  sinon.stub(properties, 'parse').callsArgWith(1, null, { empty: null });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbBulk.callCount, 0);
    test.done();
  });
};

exports['creates new language'] = function(test) {
  test.expect(7);
  var ddoc = { _attachments: { 'translations/messages-fr.properties': {} } };
  var backups = [ { doc: {
    _id: 'messages-en-backup',
    code: 'en',
    type: 'translations-backup',
    values: { hello: 'Hello', bye: 'Goodbye' }
  } } ];
  var docs = [ { doc: {
    _id: 'messages-en',
    code: 'en',
    type: 'translations',
    values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
  } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.equals(dbBulk.callCount, 1);
    test.deepEqual(dbBulk.args[0][0], { docs: [
      { // new
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        name: 'Français (French)',
        enabled: true,
        values: {
          hello: 'Hello UPDATED',
          bye: 'Goodbye UPDATED',
          added: 'ADDED'
        }
      },
      { // updated backup doc
        _id: 'messages-fr-backup',
        type: 'translations-backup',
        code: 'fr',
        values: {
          hello: 'Hello UPDATED',
          bye: 'Goodbye UPDATED',
          added: 'ADDED'
        }
      }
    ] });
    test.done();
  });
};

exports['does not recreate deleted language'] = function(test) {
  test.expect(7);
  var ddoc = { _attachments: {
    'translations/messages-fr.properties': {}
  } };
  var backups = [
    { doc: {
      _id: 'messages-en-backup',
      type: 'translations-backup',
      code: 'en',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } },
    { doc: {
      _id: 'messages-fr-backup',
      type: 'translations-backup',
      code: 'fr',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } }
  ];
  var docs = [ { doc: {
    _id: 'messages-en',
    type: 'translations',
    code: 'en',
    values: { hello: 'Hello', bye: 'Goodbye' }
  } } ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbView.callCount, 2);
    test.equals(dbBulk.callCount, 1);
    test.deepEqual(dbBulk.args[0][0], { docs: [
      { // updated backup doc
        _id: 'messages-fr-backup',
        type: 'translations-backup',
        code: 'fr',
        values: {
          hello: 'Hello UPDATED',
          bye: 'Goodbye UPDATED',
          added: 'ADDED'
        }
      }
    ] });
    test.done();
  });
};

exports['merges multiple translation files'] = function(test) {
  test.expect(7);
  var ddoc = { _attachments: {
    'translations/messages-en.properties': {},
    'translations/messages-fr.properties': {}
  } };
  var backups = [
    { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { hello: 'Hello EN', bye: 'Goodbye EN' }
    } },
    { doc: {
      _id: 'messages-fr-backup',
      code: 'fr',
      type: 'translations-backup',
      values: { hello: 'Hello FR', bye: 'Goodbye FR' }
    } }
  ];
  var docs = [
    { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { hello: 'Hello EN', bye: 'Goodbye EN CUSTOMISED' }
    } },
    { doc: {
      _id: 'messages-fr',
      code: 'fr',
      type: 'translations',
      values: { hello: 'Hello FR', bye: 'Goodbye FR CUSTOMISED' }
    } }
  ];
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
  var dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse');
  parse.onCall(0).callsArgWith(1, null, { hello: 'Hello EN UPDATED', bye: 'Goodbye EN UPDATED', added: 'EN ADDED' });
  parse.onCall(1).callsArgWith(1, null, { hello: 'Hello FR UPDATED', bye: 'Goodbye FR UPDATED', added: 'FR ADDED' });
  var dbView = sinon.stub(db.medic, 'view');
  dbView.onCall(0).callsArgWith(3, null, { rows: backups });
  dbView.onCall(1).callsArgWith(3, null, { rows: docs });
  var dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
  translations.run(function(err) {
    test.equals(err, undefined);
    test.equals(dbGet.callCount, 1);
    test.equals(dbAttachment.callCount, 2);
    test.equals(parse.callCount, 2);
    test.equals(dbView.callCount, 2);
    test.equals(dbBulk.callCount, 1);
    test.deepEqual(dbBulk.args[0][0], { docs: [
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: {
          hello: 'Hello EN UPDATED',
          bye: 'Goodbye EN CUSTOMISED',
          added: 'EN ADDED'
        }
      },
      {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        values: {
          hello: 'Hello EN UPDATED',
          bye: 'Goodbye EN UPDATED',
          added: 'EN ADDED'
        }
      },
      {
        _id: 'messages-fr',
        code: 'fr',
        type: 'translations',
        values: {
          hello: 'Hello FR UPDATED',
          bye: 'Goodbye FR CUSTOMISED',
          added: 'FR ADDED'
        }
      },
      {
        _id: 'messages-fr-backup',
        code: 'fr',
        type: 'translations-backup',
        values: {
          hello: 'Hello FR UPDATED',
          bye: 'Goodbye FR UPDATED',
          added: 'FR ADDED'
        }
      }
    ] });
    test.done();
  });
};
