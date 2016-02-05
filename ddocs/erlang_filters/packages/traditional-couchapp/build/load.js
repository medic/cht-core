var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , utils = require('./utils')

module.exports = function (root, dir, settings, doc, callback) {
  var app_settings = settings['traditional-couchapp'] || {}
  if(typeof app_settings == 'string')
    app_settings = {'path':app_settings}

  // Load the couchapp from a specified subdirectory ("." by default).
  var app_dir = app_settings.path || '.'
  dir = path.join(dir, app_dir)

  fs.readdir(dir, function (err, files) {
    if (err)
      return callback(err)

    var couchappignore = []
    if(!~ files.indexOf('.couchappignore'))
      return async.forEach(files, load_file, files_loaded)

    // Othwerwise load the .couchappignore first.
    return fs.readFile(dir + '/.couchappignore', 'utf8', function(er, body) {
      if(er)
        return callback(er)

      try {
        couchappignore = JSON.parse(body)
      } catch (json_er) {
        return callback(json_er)
      }

      if(!Array.isArray(couchappignore))
        return callback(new Error('Invalid .couchappignore JSON'))

      // With .couchappignore initialized, now load the data.
      return async.forEach(files, load_file, files_loaded)
    })

    function load_file(f, to_async) {
      var file_path = path.join(dir, f)

      // Don't add configuration files.
      if (f == 'kanso.json' || f == 'couchapp.json')
        return to_async()

      // Don't add other kanso packages directly.
      if (f == 'packages')
        return to_async()

      if(f == '_docs') {
        console.error('Additional docs unsupported: ' + file_path)
        return to_async()
      }

      // Ignore hidden files.
      if(f[0] == '.')
          return to_async()

      // Ignore files indicated in .couchappignore
      if(~ couchappignore.indexOf(f))
        return to_async()

      // Load any attachments.
      if(f == '_attachments')
        return utils.loadAttachments(dir + '/_attachments', file_path, doc, to_async)

      // Otherwise, load the file.
      utils.loadFiles(dir, file_path, doc, to_async)
    }

    function files_loaded(er) {
      callback(er, doc)
    }
  })
}
