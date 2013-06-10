# Kujua Lite Reporting

Reporting rates Kanso package for use with Kujua Lite. Supports weekly and monthly
timed reports.

## Usage Requirements

### Form Definiton

The form definition must include a `year` field and one of the following:
`week_number`, `week` or `month`.  The month or week field type must be
`"string"` or `"integer"`.

**Optionally** if you are using `list` values in the field definition, you need to
modify the validations object so the month and week values remain numeric after
the form data is parsed by Kujua Lite.

Example `fields` object for a supported form:

```json
{
    "year": {
        "type": "integer",
        "length": [
            4, 4
        ],
        "list": [
           [
              1,
              {
                 "fr": "2012",
                 "en": "2012"
              }
           ],
           [
              2,
              {
                 "fr": "2013",
                 "en": "2013"
              }
           ],
           ...
        ]
    },
    "month": {
        "type": "string",
        "length": [
            1, 2
        ],
        "list": [
            [
                1,
                {
                    "fr": "Janvier",
                    "en": "January"
                }
            ],
            ...
        ],
        "validations": {"is_numeric_month": true}
    }
}
```

Note: the keys for the year list begin with 1 because of known issue in Muvuku.

### Config.js Entry

Kujua Lite Reporting requires an associated `config.js` entry.  You need to specify
what forms you want to provide reporting rates for and what frequency those
forms are reported.  Here is an example `config.js` document:

```json
{
  "_id": "config.js",
  "values": [
    { "key": "kujua-reporting",
      "value": {
          "forms": [
            {"code":"VPD", "reporting_freq":"week"},
            {"code":"ZZZZ", "reporting_freq":"month"}
          ]
      }
    }
  ]
}
```

Once you specify the config you still need to create facility data and records.

## Kanso Installation

`kujua-reporting` is bundled as a Kanso Package and can be added or removed
from a project.  To include it in your proejct add the depenency to your
project's `kanso.json` file. It depends on the `kujua-branding` package.

```
"kujua-branding": ">=0.0.2",
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

