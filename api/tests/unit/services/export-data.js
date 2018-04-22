const service = require('../../../src/services/export-data'),
      lineage = service._lineage,
      config = require('../../../src/config'),
      childProcess = require('child_process'),
      JSZip = require('jszip'),
      sinon = require('sinon').sandbox.create(),
      moment = require('moment');

let hydrateDocs;

exports.setUp = callback => {
  hydrateDocs = sinon.stub(lineage, 'hydrateDocs');
  hydrateDocs.returns(Promise.resolve());

  sinon.stub(config, 'translate').callsFake((key, locale) => {
    return `{${key}:${locale}}`;
  });
  callback();
};

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['get logs returns error from child process'] = test => {

  var child = {
    on: sinon.stub(),
    stdout: { on: sinon.stub() },
    stdin: { end: sinon.stub() }
  };

  var spawn = sinon.stub(childProcess, 'spawn').returns(child);

  service.get({ type: 'logs', format: 'zip' }, err => {
    test.equals(spawn.callCount, 1);
    test.equals(child.stdin.end.callCount, 1);
    test.equals(err.message, 'Log export exited with non-zero status 1');
    test.done();
  });

  child.on.firstCall.args[1](1);
};

exports['get logs returns zip file'] = test => {

  var child = {
    on: sinon.stub(),
    stdout: { on: sinon.stub() },
    stdin: { end: sinon.stub() }
  };

  var spawn = sinon.stub(childProcess, 'spawn').returns(child);

  service.get({ type: 'logs', format: 'zip' }, (err, results) => {
    test.equals(spawn.callCount, 1);
    test.equals(child.stdin.end.callCount, 1);
    test.equals(spawn.firstCall.args[0], 'sudo');
    test.equals(spawn.firstCall.args[1][0], '/boot/print-logs');
    test.equals(spawn.firstCall.args[2].stdio, 'pipe');
    test.equals(err, null);
    new JSZip()
      .loadAsync(results)
      .then(function(zip) {
        return zip.file('server-logs-' + moment().format('YYYYMMDD') + '.md').async('string');
      })
      .then(function(result) {
        test.equals(result, 'helloworld');
        test.done();
      });
  });

  child.stdout.on.firstCall.args[1](new Buffer('hello', 'utf-8'));
  child.stdout.on.firstCall.args[1](new Buffer('world', 'utf-8'));
  child.on.firstCall.args[1](0);
};
