async = require("async")
utils = require("kanso-utils/utils")
modules = require("kanso-utils/modules")
attachments = require("kanso-utils/attachments")

doProcessPaths = (pattern, processItem, path, callback) ->
  # Find all the files that match the pattern within the given path
  utils.find path, pattern, (err, files) ->
    return callback(err) if err 
    # Process the files asynchronously
    async.forEach files, processItem, (err, doc)->
      callback(err, doc)

module.exports =
  # Ensure that we have an array of absolute paths
  normalizePaths: (paths, cwd)->
    paths = [ paths ] unless Array.isArray(paths)   # Ensure paths is an array
    for folder in paths     # Convert paths to absolute path
      utils.abspath(folder, cwd)

  processPaths: (paths, pattern, processItem, callback)->
    async.forEach(paths, async.apply(doProcessPaths, pattern, processItem), (err,doc)->callback(err, doc))
    
  addModule: (doc, name, originalPath, content)->
    modules.add(doc, name, content)
    # These next two lines are a hack to make sure that the kanso-utils/utils.require works for modules added by this method
    doc._module_paths ?= {}
    utils.setPropertyPath(doc._module_paths, name, originalPath);
 
  addAttachment: (doc, name, originalPath, content)->
    attachments.add(doc, name, originalPath, content)
