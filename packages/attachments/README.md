## Attachments Package

The attachments package provides build-steps for adding static files as
attachments to your design doc. Use this for loading static HTML, CSS, JS etc.


### Install

Add `attachments` to your dependencies section in `kanso.json`.

```javascript
...
  "dependencies": {
    "attachments": null,
    ...
  }
```

Run `kanso install` to fetch the package.


### Configure

To tell the package which files to read and add to the design doc, add the
attachments property to your `kanso.json` and list the files you want to load.

```javascript
...
  "attachments": ["index.html", "css"]
  ...
  "dependencies": {
    "attachments": null,
    ...
  }
```

You can list individual files or whole directories in the `attachments` property.
Hidden files and directories (with a preceeding '.') are ignored.


### Usage

Once you've updated your settings in `kanso.json`, the next time you `kanso push`
these files will be read from the filesystem and added as attachments to your
app. These attachments are then available at http://hostname:port/dbname/\_design/appname/attachment_path

The path used for the attachments is the relative path to the file from your project directory.
