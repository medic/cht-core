# Git Info Kanso Module

This is a kanso module that adds git information to the design doc. This comes in handy when being a devop.

## Install

Add to your project's kanso.json dependencies setting, here is the minimal case:

```json
"dependencies": {
    "git-info": null
}
```

Run kanso install to install in your packages directory:

```
kanso install
```

Now when you do a kanso push, you will see the following on your design doc:

```json
{
    kanso : {
        git : {
           "commit": "8da0267f9530aa2c9570c34f58d8a9b04a058536",
           "uncommitted": [
               "M kanso.json",
               "D  static/img/application-tile.png",
               "D  static/img/kanso_icon_20.png"
           ]
        }

    }
}

```

if you don't want to see the uncommitted changes, add the following to your projects kanso.json

```json
"git_info" : {
    "skip_uncommitted" : true
}
```

