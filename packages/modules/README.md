## Modules Package

The modules package provides build-steps for adding CommonJS modules to your
design doc. Use this for loading JavaScript modules (using require() and exports)
for use server-side with CouchDB and client-side in the browser.


### Install

Add `modules` to your dependencies section in `kanso.json`.

```javascript
...
  "dependencies": {
    "modules": null,
    ...
  }
```

Run `kanso install` to fetch the package.


### Configure

To tell the package which files to read and add to the design doc, add the
modules property to your `kanso.json` and list the files you want to load.

```javascript
...
  "modules": ["app.js", "lib"]
  ...
  "dependencies": {
    "modules": null,
    ...
  }
```

You can list individual files or whole directories in the `modules` property.
Hidden files and directories (with a preceeding '.') and files with an extension
other than `.js` are ignored.


### Usage

Once you've updated your settings in `kanso.json`, the next time you `kanso push`
these files will be read from the filesystem and added as modules to your
app. These modules are then available inside your show, list, update etc functions
server-side and can be accessed client-side by including the `modules.js` script
in your page:

```xml
<script src="modules.js"></script>
<script>
    var db = require('db');
</script>
```

The require path used for the modules is the relative path to the file from it's
package directory.


### Modules.js Attachment

This will bundle all your CommonJS modules into a single `.js` file for use in
the browser. Once you include it in the page you can then use the `require()`
function. If you're behind a _rewrite URL, you may have to set up a rewrite to the
`modules.js` attachment before you can include it.

If you only use modules server-side, you can avoid creating the attachments by
adding the following property to your `kanso.json` file:

```javascript
...
  "modules_attachment": false,
  ...
  "dependencies": {
    "modules": null
    ...
  }
```

You can minify the module.js attachment by adding the `--minify` flag when you push:

```
kanso push http://localhost:5984/dbname --minify
```

You can also add `minify` to the environment definitions in your `.kansorc` file:

```
exports.env = {
    "default": {
        db: "http://user:password@localhost:5984/dbname"
    },
    "prod": {
        db: "http://user:password@hostname/dbname",
        minify: true
    }
};
```
