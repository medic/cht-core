# Kanso Duality Loading Package

## Install

Add to your project's kanso.json dependencies setting:

```
        "duality-contrib-loading": null,
```

Run kanso install to download and unarchive the package to your packages
directory:

```
kanso install
```

## Customization

### Style
Style the `#duality-contrib-loading` div with your own css or use `example.less` as
a start.

### Timeout setting

Tweak the timeout value (milliseconds) in your `kanso.json`. 

```
"duality-contrib-loading": {
    "timeout": 1
},
```

Then the loading message will only appear for requests taking longer than 1ms.
The default is 300ms.

