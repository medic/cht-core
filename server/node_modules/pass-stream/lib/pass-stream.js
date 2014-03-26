'use strict';

var Stream = require('stream');
var util = require('util');

/*
 * I found an issue with falsey values which I am waiting for
 * a few pull requests to node and readable-stream, so in the
 * meantime use the patched version from my repo
 *
 * https://github.com/isaacs/readable-stream/pull/55
 * https://github.com/joyent/node/pull/5181

// node 0.10+ has Transform stream so use it if available
// otherwise use readable-stream module
var Transform = (Stream.Transform) ?
  Stream.Transform :
  require('readable-stream').Transform;

 */

var Transform = require('readable-stream').Transform;

function PassThroughExt(writeFn, endFn, options) {
  if (!(this instanceof PassThroughExt)) {
    return new PassThroughExt(writeFn, endFn, options);
  }
  Transform.call(this, options);
  this._writeFn = writeFn;
  this._endFn = endFn;
}

util.inherits(PassThroughExt, Transform);

function passTransform(chunk, encoding, cb) {
  /*jshint validthis:true */
  this.push(chunk);
  cb();
}

PassThroughExt.prototype._transform = function _transform(chunk, encoding, cb) {
  if (this._writeFn) return this._writeFn.apply(this, arguments);
  return passTransform.apply(this, arguments);
};

PassThroughExt.prototype._flush = function _flush(cb) {
  if (this._endFn) return this._endFn.apply(this, arguments);
  return cb();
};

function passStream(writeFn, endFn, options) {
  var stream = new PassThroughExt(writeFn, endFn, options);
  return stream;
}

module.exports = passStream;