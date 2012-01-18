# Kanso Showdown

This package allows you to quickly start using
[Showdown](https://github.com/coreyti/showdown/) in your Kanso project.

## Install

Add to your project's kanso.json dependencies setting, here is the minimal
case:

```json
"dependencies": {
    "modules": null,
    "showdown": null
}
```

Run `kanso install` to fetch and install your package.

## Usage

Require the module in your code and call makeHtml.

```javascript
var showdown = require('showdown'),
    sd = new showdown.converter(),
    data = 'Markdown *helps* a lot.';

$('#content').html(sd.makeHtml(data));
```
        
Do a kanso push to build and deploy to your CouchDB:

```
kanso push http://localhost:5984/example
```

## Docs

A good place to start is the original showdown package's readme bundled in
`packages/showdown/showdown/README.md`.

## Maintenance 

### CommonJS Patch

*Note* the showdown.js library was modified slightly to be commonjs compatible.

```diff
< if (typeof module.exports != 'undefined') module.exports = Showdown;
---
> if (typeof exports != 'undefined') exports.Showdown = Showdown;
```

