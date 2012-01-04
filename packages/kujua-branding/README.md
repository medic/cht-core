# Kujua Branding

This package includes css/less code and font files that allows for easy
inclusion into your application.

## Install

Add to your kanso.json dependencies:

```json
    "kujua-branding": ">=0.0.1"
```

`kanso install` will not work as expected because we don't have our own
repository yet, so just copy the package into your packages directory.

## Configure

By default the Kujua font (DroidSerif Bold) is embedded as a TTF/truetype font
in `base.less`.  So all you need to do is import it into your main less file:

```css
@import "packages/kujua-branding/css/base.less";
```

## Options

More fonts are available in the `static/fonts` directory.  Optionally, you can
edit the `kujua-branding/kanso.json` attachments property if you want to
include them, e.g.:

```
    "attachments": ["static/fonts/droidserif/DroidSerif-Bold.eot","static/fonts/droidserif/DroidSerif-Bold.ttf"],
```

## Font Notes

The TTF font is embedded as base64 because of browser bugs experienced on
Chrome that cause unnecessary flicker when loading fonts.  Embedding was the
easiest way to fix it though there are others.  To convert the font I used the
unix command line tools `base64`.

This package also inculdes EOT fonts designed by Microsoft that are used in
versions of IE.  We don't use these since we are not targeting IE at the
moment.  The EOT files are probably not needed anymore but leaving them around
for now.

