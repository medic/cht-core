var fs = require('fs')
  , async = require('async')
  , utils = require('kanso-utils/utils')
  , attachments = require('kanso-utils/attachments')

exports.loadAttachments = function (pkgdir, p, doc, callback) {
  attachments.addPath(pkgdir, p, doc, callback)
}

exports.loadFiles = function (pkgdir, p, doc, callback) {
  p = utils.abspath(p, pkgdir)
  exports.find(p, function (err, files) {
    if (err)
      return callback(err)

    async.forEach(files, function (f, cb) {
      exports.addFile(pkgdir, f, doc, cb)
    }, callback)
  })
}

exports.addFile = function (pkgdir, p, doc, callback) {
  fs.readFile(p, 'utf8', function (err, content) {
    if (err)
      return callback(err)

    var rel = utils.relpath(p, pkgdir)
      , prop = rel
      , parts = rel.split('.')

    if(parts.length > 1) {
      prop = parts.slice(0, parts.length - 1).join('.')

      // Files with a .json extension are structured data, not a string.
      if(parts[parts.length - 1] == 'json')
        content = JSON.parse(content)
    }

    exports.add(doc, prop, content)
    callback()
  })
}

exports.add = function (doc, path, src) {
  utils.setPropertyPath(doc, path, src)
  return doc
}

exports.find = async.memoize(function (p, callback) {
  utils.find(p, exports.filenameFilter(p), callback)
})

exports.filenameFilter = function (p) {
  return function (f) {
    if (f === p)
      return true

    var relpath = utils.relpath(f, p)
    // should not start with a '.'
    if (/^\.[^\/]?/.test(relpath))
      return false

    // should not contain a file or folder starting with a '.'
    if (/\/\./.test(relpath))
      return false

    return true
  }
}
