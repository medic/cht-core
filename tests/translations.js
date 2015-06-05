var sinon = require('sinon'),
    fs = require('fs'),
    properties = require('properties'),
    config = require('../config'),
    translations = require('../translations'),
    db = require('../db');

var restore = function(fns) {
  fns.forEach(function(fn) {
    if (fn.restore) {
      fn.restore();
    }
  });
};

exports.tearDown = function (callback) {
  restore([
    fs.readdir,
    fs.readFile,
    config.get,
    properties.parse,
    db.medic.get,
    db.medic.insert
  ]);
  callback();
};

exports['run does nothing if no translations'] = function(test) {
  test.expect(2);
  var configGet = sinon.stub(config, 'get').returns([]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, []);
  translations.run(function() {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.done();
  });
};

exports['run returns errors from readdir'] = function(test) {
  test.expect(1);
  sinon.stub(config, 'get').returns([]);
  sinon.stub(fs, 'readdir').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(err, 'boom');
    test.done();
  });
};

exports['run returns errors from readFile'] = function(test) {
  test.expect(2);
  var configGet = sinon.stub(config, 'get').returns([]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages-en.properties' ]);
  sinon.stub(fs, 'readFile').callsArgWith(2, 'boom');
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(err, 'boom');
    test.done();
  });
};

exports['run returns errors from readFile'] = function(test) {
  test.expect(3);
  var configGet = sinon.stub(config, 'get').returns([]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages.properties' ]);
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(err.message, 'Could not parse country code for translation file "messages.properties"');
    test.done();
  });
};

exports['run returns errors from properties parse'] = function(test) {
  test.expect(6);
  var configGet = sinon.stub(config, 'get').returns([]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages-en.properties' ]);
  var readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(readFile.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(parse.firstCall.args[0], 'some buffer');
    test.equals(err, 'boom');
    test.done();
  });
};

exports['run returns errors from db get'] = function(test) {
  test.expect(6);
  var configGet = sinon.stub(config, 'get').returns([]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages-en.properties' ]);
  var readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, 'boom');
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(readFile.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbGet.callCount, 1);
    test.equals(err, 'boom');
    test.done();
  });
};

exports['run does not save if nothing changed'] = function(test) {
  test.expect(5);
  var configGet = sinon.stub(config, 'get').returns([
    {
      key: 'first',
      translations: [{ locale: 'en', default: '1st', content: '1st' }]
    },
    {
      key: 'second',
      translations: [{ locale: 'en', default: '2nd', content: '2nd' }]
    }
  ]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages-en.properties' ]);
  var readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, {
    first: '1st',
    second: '2nd'
  });
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(readFile.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(err, null);
    test.done();
  });
};

exports['run handles empty configuration'] = function(test) {
  test.expect(7);
  var configGet = sinon.stub(config, 'get').returns(undefined);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [ 'messages-en.properties' ]);
  var readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse').callsArgWith(1, null, {
    first: '1st',
    second: '2nd'
  });
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, {
    app_settings: { }
  });
  var dbInsert = sinon.stub(db.medic, 'insert').callsArgWith(1);
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(readFile.callCount, 1);
    test.equals(parse.callCount, 1);
    test.equals(dbGet.callCount, 1);
    test.same(dbInsert.firstCall.args[0], {
      app_settings: {
        translations: [
          {
            key: 'first',
            translations: [ { locale: 'en', default: '1st', content: '1st' } ]
          },
          {
            key: 'second',
            translations: [ { locale: 'en', default: '2nd', content: '2nd' } ]
          }
        ]
      }
    });
    test.equals(err, null);
    test.done();
  });
};

exports['run saves all changes'] = function(test) {
  test.expect(7);
  var configGet = sinon.stub(config, 'get').returns([
    {
      key: 'first',
      translations: [
        { locale: 'en', default: '1st', content: '1st' }, // unchanged
        { locale: 'fr', default: '1st', content: '1' } // changed
      ]
    },
    {
      key: 'second',
      translations: [
        { locale: 'en', default: '2nd', content: '2nd' }, // not updated
        { locale: 'fr', default: '2nd', content: '2nd' } // not provided in file
      ]
    }
  ]);
  var readdir = sinon.stub(fs, 'readdir').callsArgWith(1, null, [
    'messages-en.properties',
    'messages-fr.properties',
    'messages-es.properties'
  ]);
  var readFile = sinon.stub(fs, 'readFile');
  readFile.onFirstCall().callsArgWith(2, null, 'some buffer');
  readFile.onSecondCall().callsArgWith(2, null, 'some buffer');
  readFile.onThirdCall().callsArgWith(2, null, 'some buffer');
  var parse = sinon.stub(properties, 'parse');
  parse.onFirstCall().callsArgWith(1, null, {
    first: 'FIRST',
    second: '2nd'
  });
  parse.onSecondCall().callsArgWith(1, null, {
    first: '1st',
    second: 'deux'
  });
  parse.onThirdCall().callsArgWith(1, null, {
    first: 'uno',
    second: null // should be ignored
  });
  var dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, {
    app_settings: { translations: [ { key: 'last', translations: [] } ] }
  });
  var dbInsert = sinon.stub(db.medic, 'insert').callsArgWith(1);
  translations.run(function(err) {
    test.equals(configGet.callCount, 1);
    test.equals(readdir.callCount, 1);
    test.equals(readFile.callCount, 3);
    test.equals(parse.callCount, 3);
    test.equals(dbGet.callCount, 1);
    test.same(dbInsert.firstCall.args[0], {
      app_settings: {
        translations: [
          {
            key: 'first',
            translations: [
              { locale: 'en', default: 'FIRST', content: 'FIRST' },
              { locale: 'fr', default: '1st', content: '1' },
              { locale: 'es', default: 'uno', content: 'uno' }
            ]
          },
          {
            key: 'second',
            translations: [
              { locale: 'en', default: '2nd', content: '2nd' },
              { locale: 'fr', default: 'deux', content: 'deux' }
            ]
          }
        ]
      }
    });
    test.equals(err, null);
    test.done();
  });
};
