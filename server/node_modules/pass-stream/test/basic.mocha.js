/*global suite:false test:false */
'use strict';

var Stream = require('stream');
var chai = require('chai-stack');
var passStream = require('..'); // require('pass-stream');

var t = chai.assert;

suite('basic');

test('simple use', function (done) {
  var accum = [];
  var rstream = new Stream();
  rstream
    .pipe(passStream(null, null, { objectMode: true }))
    .on('error', function (err) { done(err); })
    .on('data', function (data) { accum.push(data); })
    .on('end', function () {
      t.deepEqual(accum, [1, 2, 3]);
      done();
    });
  process.nextTick(function () {
    rstream.emit('data', 1);
    rstream.emit('data', 2);
    rstream.emit('data', 3);
    rstream.emit('end');
  });
});

test('paused', function (done) {
  var accum = [];
  var rstream = new Stream();
  var s = rstream
    .pipe(passStream(null, null, { objectMode: true }))
    .on('data', function (data) { accum.push(data); })
    .on('end', function () {
      t.deepEqual(accum, [1, 2, 3]);
      done();
    });
  s.pause();
  process.nextTick(function () {
    rstream.emit('data', 1);
    rstream.emit('data', 2);
    rstream.emit('data', 3);
    rstream.emit('end');
    s.resume();
  });
});


