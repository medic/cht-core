var request = require('request'),
    fs = require('fs'),
    path = require('path'),
    send = require('send'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp'),
    cacheDir = '.cache',
    storedHeaders = [ 'content-encoding' ];

var retrieve = function(req, res, next, cachePath, options) {
  getMeta(cachePath, function(err, meta) {
    if (err) {
      return next(err);
    }
    send(req, cachePath, options)
      .on('headers', function(res) {
        if (meta && meta.headers) {
          meta.headers.forEach(function(header) {
            if (header.value) {
              res.setHeader(header.key, header.value);
            }
          });
        }
      })
      .on('error', function(err) {
        next(err.status === 404 ? null : err);
      })
      .pipe(res);
  });
};

var getMetaPath = function(cachePath) {
  return cachePath + '.json';
};

var getMeta = function(cachePath, callback) {
  fs.readFile(getMetaPath(cachePath), function(err, data) {
    if (err) {
      return callback(err);
    }
    callback(null, JSON.parse(data));
  });
};

var setMeta = function(cachePath, res, callback) {
  var meta = {
    headers: storedHeaders.map(function(header) {
      return { key: header, value: res.headers[header] }
    })
  };
  fs.writeFile(getMetaPath(cachePath), JSON.stringify(meta), callback);
};

exports = module.exports = function cacheResponse(target, options) {

  // Delete cache directory on start
  rimraf.sync(cacheDir);

  return function (req, res, next) {

    if (req.method !== 'GET') {
      return next();
    }

    var cachePath = cacheDir + req.originalUrl;
    if (fs.existsSync(cachePath)) {
      return retrieve(req, res, next, cachePath, options);
    }

    mkdirp(path.dirname(cachePath), function(err) {
      if (err) {
        return next(err);
      }
      req
        .pipe(request(target + req.originalUrl))
        .on('response', function (resp) {
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            var stream = fs.createWriteStream(cachePath);
            stream.on('finish', function() {
              setMeta(cachePath, resp, function(err) {
                if (err) {
                  return next(err);
                }
                retrieve(req, res, next, cachePath, options);
              });
            });
            resp.pipe(stream);
          } else {
            next();
          }
        })
    });

  };
};