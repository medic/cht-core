# Kanso Bootstrap

This package allows you to quickly start using [Twitter
Bootstrap](http://twitter.github.com/bootstrap/) and Less in your Kanso
project. 

## Install

Add to your project's kanso.json dependencies setting, here is the minimal
case:

```json
"dependencies": {
    "attachments": null,
    "less-precompiler": null,
    "bootstrap": null
}
```

Run kanso install to install in your packages directory:

```
kanso install
```

## Configure 

Configure bootstrap to be compiled with Less.

### Compiled CSS

Create a css/less file `static/css/example.less` for your site that
includes bootstrap:

```css
@import "packages/bootstrap/bootstrap/less/bootstrap.less";
/* Now use bootstrap and less! */
body { background-color: @pink; }
```

Include the less file in your HTML:

*Note* we refer to the file with a `.css` extention because that is what it
compiles to.

```html
<html>
  <head>
    <link rel="stylesheet" type="text/css" href="static/css/example.css" />
  </head>
  <body>
    <h1>Hello, world!</h1>
  </body>
</html>
```

Tell Kanso to compile the less files and attach them as css:

```json
{
    "name": "example-app",
    "version": "0.0.1",
    "description": "The simplest possible app with bootstrap and less support.",
    "attachments": ["index.html", "static"],
    "less": {
        "compress": true,
        "compile": ["static/css/example.less"],
        "remove_from_attachments": true
    },
    "dependencies": {
        "attachments": null,
        "less-precompiler": null,
        "bootstrap": null
    }
}
```

### Icons

Bootstrap 2.0 provides icons with the following html:

```html
<i class="icon-chevron-left"></i>
```

To include the icons/sprite in your project, include the sprites `png` files 
in your static diretory.

1. Make a folder, `mkdir -p static/img` in your kanso project
2. Copy the sprite images into the directory, e.g. `cp packages/bootstrap/bootstrap/img/* static/img`

## Deploy

Do a kanso push to make the build and deploy to your CouchDB:

```
kanso push example
```

## Docs

You an browse the Bootstrap docs locally in the package directory under
`bootstrap/docs/index.html` or check the website.

## Upgrading

### 2.0.1-kanso.1

The directory structure changed so instead of including lib/bootstrap.less you
include less/bootstrap.less. You also need to update the sprite image path, see
the Icons section above.

