# Kanso Bootstrap with Font Awesome

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
    "bootstrap-fontawesome": null
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
@import "bootstrap/less/bootstrap.less";
@baseFontPath: "../../bootstrap/font/";
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

Include a `less` section in your `kanso.json` to compile less files and attach
them as css:

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
        "bootstrap-fontawesome": null
    }
}
```

### Icons

In this package we updated Bootstrap to use the [Font
Awesome](http://fortawesome.github.com/Font-Awesome/) icon set.  It's a little
bleeding edge and is not merged with Bootstrap yet but provides you with
several nice features.  

The font files are include as attachments when you build your design
doc, but the default path needs adjustment.  To reference your font files
modify your less code:

```
@baseFontPath: "../../bootstrap/font/";
```

## Deploy

Do a kanso push to make the build and deploy to your CouchDB:

```
kanso push example
```

## Docs

You an browse the Bootstrap docs locally in the package directory under
`bootstrap/docs/index.html` or check the website.  Soon we will add the Font
Awesome docs to also make them available locally, for now browse the website.

## Upgrading

### 2.0.1-kanso.1

Added font-awesome, and turned on by default. 

