# Kujua Reporting

Reporting rates Kanso package for use with Kujua. Supports weekly and monthly
timed reports.


## Requirements 

The form and corresponding data record must one of the following properties to
do reporting rates analytics:

* `week_number` 
* `week`
* `month`

Requires a `config.js` that contains the forms you want to track. See
Configure section below.

Once you specify the config you still need to create facility data and records.

## Kanso dependencies

```
"kujua-branding": ">=0.0.2"
```

## Install

Add depenency to your project's `kanso.json` file.

```
"kujua-reporting": null
```

Include the Raphael graphics library in your base template before `modules.js` is loaded.

```
<script src="{baseURL}/static/kujua-reporting/js/raphael.js" type="text/javascript"></script>
```

Include styles in your `app.less` file:

```
@import "packages/kujua-branding/css/base.less"; // requires kujua-branding
@import "packages/kujua-reporting/css/base.less";
```

## Configure

Kujua Reporting requires an associated `config.js` entry.  You need to specify
what forms you want to provide reporting rates for and what frequency those
forms are reported.  Here is an example `config.js` document:

```
{
  "_id": "config.js",
  "values": [
    { "key": "kujua-reporting",
      "value": {
          "forms": [
            {"code":"VPD", "reporting_freq":"week"},
            {"code":"TEST", "reporting_freq":"month"}
          ]
      }
    }
  ]
}
```
