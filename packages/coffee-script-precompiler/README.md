## Usage

Add `coffee-script-precompiler` to your dependencies in `kanso.json`.

```javascript
"dependencies": {
        ...
        "coffee-script-precompiler": null
}
        
```

Add a `coffee-script` field to `kanso.json` with one or both of the following: a list of folders to search for coffeescript modules and a list of folders to search for coffeescript attachments.

```javascript
"coffee-script": {
    "modules": ["lib", "tests"],
    "attachments": ["js"]
},
```

Run `kanso intall` from your terminal to install dependencies.

When you `kanso push`:
1. All coffeescript modules listed in `coffee-script.modules` will be compiled to javascript and uploaded as usual.
2. All coffeescript files in `attachements` directories will be uploaded as attachments at the corrosponding path with a `.js` extension. So `/lib/js/main.coffee` will be uploaded to `/lib/js/main.js`.