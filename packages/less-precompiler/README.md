# less-precompiler

The less-precompiler allows you to author your stylesheets with the CSS superset of
[LESS](http://lesscss.org/#docs). It supports `@variables`, `.mixins()` and lots of
other really useful stuff. The less files will get compiled and \_attached to your 
couchapp on every build and can even be compressed.


### Install

Add `less-precompiler` to your dependencies section in `kanso.json`.

```javascript
  ...
  "dependencies": {
    "less-precompiler": null,
    ...
  }
```

> run `kanso install` to fetch the package


### Configure

To tell the precompiler which files to transform, add the section `less`,
and in a key called `compile`, list the files you want to process.

```javascript
  ...
  "less": {
    "compile": [ "css/style.less", ... ]
  }
  ...
  "dependencies": {
    "less-precompiler": null,
    ...
  }

```

> Running `kanso push` will compile the file `css/style.less` to 
`css/style.css` and upload it to `_attachments/css/style.css`.


### Compression

To enable compression of the output, add the `compress` flag and set it to `true`.

```javascript
  ...
  "less": {
    "compile": [ ... ],
    "compress": true
  }
```


### Include paths

Less files can include other less templates, sometimes it's useful for a
package to provide uncompiled .less files for use in a project. Before you
can include them in the project's templates, the package providing the
files needs to add the less path. This is so the compiler knows where to
lookup the file when you `@include` it.

```javascript
  ...
  "less": {
    "paths": ["./bootstrap"]
  }
```


### Removing original .less files

You can also remove any .less files from attachments (if you placed them inside a
directory also added as static files), by adding the `remove_from_attachments`
property. This will remove all attachment with a `.less` extension!

```javascript
  ...
  "less": {
    "compile": [ ... ],
    "remove_from_attachments": true
  }
```
