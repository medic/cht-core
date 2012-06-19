This is a small CommonJS module that can be used by packages that precompile files and add them to design documents, such as compiling javascript code, html templates or css stylesheets.

## Usage
Install the npm package in your own precompiler package:

    npm install kanso-precompiler-base

In your precompiler package code (usually in `build/compile`) require the precompiler to get access to its methods:

    precompiler = require("kanso-precompiler-base")

## Example
This example is taken from the Eco template precompiler.  It uses a method called compileTemplate to actually compile the Eco templates into JavaScript.

    module.exports =
      before: "modules"
      run: (root, path, settings, doc, callback) ->
        console.log "Running eco pre-compiler"
        return callback(null, doc) unless settings["eco"]?["templates"]?

        # Extract the template paths from the settings
        templatePaths = precompiler.normalizePaths(settings["eco"]["templates"], path)

        # Create a continuation that processes a template using the given doc and path
        processTemplate = async.apply(compileTemplate, doc, path)

        # Run processTemplate, asynchronously, on each of the files that match the given pattern, in the given paths 
        precompiler.processPaths(templatePaths, /.*\.j?eco$/i, processTemplate, callback)

Notice also that we pass the callback function that was passed to us into the processPaths function.  This is so that Kanso knows when the precompilation is complete but also, more importantly, gives Kanso the doc object to which we have added.

## Reference

### normalizePaths: (paths, cwd)
Use this method to get a nice array of absolute paths from an entry in the settings object.

- `paths`: either a string or an array containing one or more relative paths to the files to be precompiled.
- `cwd`: a string containing the current working directory to which the given paths are relative.


### processPaths: (paths, pattern, processItem, callback)
Use this function to process each of the files in each of the paths that match the given pattern

- `paths`: A normalized array of paths to search for items to process
- `pattern`: A regular expression that matches the files to be processed
- `processItem`: The function to be executed to actually do the precompilation
- `callback`: The function to be called once all the items have breen precompiled - of the form: callback(err, doc)

### addModule: (doc, name, originalPath, content)
Use this function to add a CommonJS module to the design document, which can be required in JS code on the server or can be stitched up by the modules package into the modules.js file for use in the browser.

- `doc`: The design document where the module will be added
- `name`: The name of the module (without extension)
- `originalPath`: The original full filename of the module before precompilation
- `content`: The content of the precompiled module

### addAttachment: (doc, name, originalPath, content)
Use this function to add an item to the design document as an attachment, which can be downloaded for use in the browser.

- `doc`: The design document where the attachment will be added
- `name`: The name of the attachment
- `originalPath`: The original full filename of the attachment before precompilation
- `content`: The content of the precompiled attachment

