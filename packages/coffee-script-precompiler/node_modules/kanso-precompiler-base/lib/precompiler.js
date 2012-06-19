(function() {
  var async, attachments, doProcessPaths, modules, utils;

  async = require("async");

  utils = require("kanso-utils/utils");

  modules = require("kanso-utils/modules");

  attachments = require("kanso-utils/attachments");

  doProcessPaths = function(pattern, processItem, path, callback) {
    return utils.find(path, pattern, function(err, files) {
      if (err) return callback(err);
      return async.forEach(files, processItem, function(err, doc) {
        return callback(err, doc);
      });
    });
  };

  module.exports = {
    normalizePaths: function(paths, cwd) {
      var folder, _i, _len, _results;
      if (!Array.isArray(paths)) paths = [paths];
      _results = [];
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        folder = paths[_i];
        _results.push(utils.abspath(folder, cwd));
      }
      return _results;
    },
    processPaths: function(paths, pattern, processItem, callback) {
      return async.forEach(paths, async.apply(doProcessPaths, pattern, processItem), function(err, doc) {
        return callback(err, doc);
      });
    },
    addModule: function(doc, name, originalPath, content) {
      modules.add(doc, name, content);
      if (doc._module_paths == null) doc._module_paths = {};
      return utils.setPropertyPath(doc._module_paths, name, originalPath);
    },
    addAttachment: function(doc, name, originalPath, content) {
      return attachments.add(doc, name, originalPath, content);
    }
  };

}).call(this);
