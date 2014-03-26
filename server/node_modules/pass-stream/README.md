# pass-stream - pass-through node.js stream which can filter/adapt and pause data

pass-stream is a pass-through stream which allows transform fns for easily filtering or adapting the data that flows through the stream.

It is a light wrapper over the new (streams2) readable-stream functionality which is available as add in for node 0.8 and is built-in for node 0.10+

[![Build Status](https://secure.travis-ci.org/jeffbski/pass-stream.png?branch=master)](http://travis-ci.org/jeffbski/pass-stream)

## Installation

```bash
npm install pass-stream
```

## Usage

 - `passStream(writeFn, endFn, options)` optional writeFn, endFn, and options. Returns a pauseable stream which can be piped or used like any other. Options are the same as for standard streams (for instance set objectMode = true to allow arbitrary non-null objects to be used.


```javascript
var passStream = require('pass-stream');
var ps = passStream(); // constructing stream without any transformations
readStream
  .pipe(ps)
  .pipe(anotherStream)
```

To add transform/filter functionality you may provide a writeFn and/or endFn which allows you to tap into the write and end processing.

If you provide a writeFn, then it is up to you to call `this.push(data)` with whatever transformed data and call the cb. The writeFn has signature `writeFn(chunk, encoding, cb)`

If you provide an endFn, then it will be be fired after all the data has been read but before the `end` event has been fired. You may do additional `this.push(data)` and then call the cb when done. hooked up as a listener for `on('end')`. The endFn has signature `endFn(cb)`.

The `this` context of the writeFn and endFn is set to that of the stream so you have all the normal stream functions like `emit`, `pause`, and `resume`. Note: you will not want to call `write` or `end` from within these functions since they will cause a recursive loop.

```javascript
var passStream = require('pass-stream');
  var length = 0;
  function writeFn(data, encoding, cb) { // we are assuming data is strings
    this.push(data.toUpperCase());  // upper case
    length += data.length;  // keep track of length
    cb();
  }
  function endFn(cb) {
    this.emit('length', length); // emit length now that it is done
    cb();
  }
  var lengthResult = 0;
  var options = {};
  var rstream = new Stream();
  rstream
    .pipe(passStream(writeFn, endFn, options))  // construct a passStream with transformFns
    .on('length', function (len) { lengthResult = len; })
    .pipe(anotherStream);
```


## Goals

 - Easily use new streams2 functionality (readable-streams) with node 0.8 or 0.10+
 - Built-in buffering pause capability (from streams2)
 - Easy to use transformation filters with the stream
 - Act as the base to build other specific pass through streams with
 - Tested
 - Allows any datatype (except null or undefined) to be used in the stream (String, Buffer, Number, Boolean, Array, Object)

## Why

While node 0.8 is still needed, this creates easy wrapper to allow for the transition to node 0.10


## Get involved

If you have input or ideas or would like to get involved, you may:

 - contact me via twitter @jeffbski  - <http://twitter.com/jeffbski>
 - open an issue on github to begin a discussion - <https://github.com/jeffbski/pass-stream/issues>
 - fork the repo and send a pull request (ideally with tests) - <https://github.com/jeffbski/pass-stream>

## License

 - [MIT license](http://github.com/jeffbski/pass-stream/raw/master/LICENSE)

