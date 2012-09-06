(function() {
  module.exports = {
    before: "modules",
    run: function(root, path, settings, doc, callback) {
      var async, attachments, attachmentsPaths, coffee, compileAttachment, compileModule, extension_pattern, file_pattern, modules, modulesPaths, precompiler, processAttachments, processModules, utils, _ref, _ref2;
      modulesPaths = (_ref = settings["coffee-script"]) != null ? _ref["modules"] : void 0;
      attachmentsPaths = (_ref2 = settings["coffee-script"]) != null ? _ref2["attachments"] : void 0;
      if (!((modulesPaths != null) || (attachmentsPaths != null))) {
        console.log("CoffeeScript precompiler requires either a 'modules' or an 'attachment' setting");
        return callback(null, doc);
      }
      if (modulesPaths == null) {
        modulesPaths = [];
      }
      if (attachmentsPaths == null) {
        attachmentsPaths = [];
      }
      async = require("async");
      utils = require("kanso-utils/utils");
      precompiler = require("kanso-precompiler-base");
      coffee = require("coffee-script");
      file_pattern = /.*\.coffee$/i;
      extension_pattern = /\.coffee$/;
      compileAttachment = function(filename, callback) {
        var js, name, rel;
        rel = utils.relpath(filename, path);
        console.log("Compiling attachment " + rel);
        js = coffee.compile(fs.readFileSync(filename, 'utf8'), {
          filename: rel
        });
        name = rel.replace(extension_pattern, ".js");
        precompiler.addAttachment(doc, name, filename, js);
        return callback(null, doc);
      };
      compileModule = function(filename, callback) {
        var js, name, rel;
        rel = utils.relpath(filename, path);
        console.log("Compiling module " + rel);
        js = coffee.compile(fs.readFileSync(filename, 'utf8'), {
          filename: rel
        });
        name = rel.replace(extension_pattern, "");
        precompiler.addModule(doc, name, filename, js);
        return callback(null, doc);
      };
      modules = precompiler.normalizePaths(settings["coffee-script"]["modules"], path);
      attachments = precompiler.normalizePaths(attachmentsPaths, path);
      processModules = async.apply(precompiler.processPaths, modules, file_pattern, compileModule);
      processAttachments = async.apply(precompiler.processPaths, attachments, file_pattern, compileAttachment);
      return async.parallel([processModules, processAttachments], function(err, results) {
        return callback(err, doc);
      });
    }
  };
}).call(this);
