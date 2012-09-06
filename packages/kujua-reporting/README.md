# Kujua Reporting

Reporting rates Kanso package for use with Kujua. Supports weekly and monthly
timed reports, based on if the records has a `week_number` or `month` property.

## Dependencies

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

