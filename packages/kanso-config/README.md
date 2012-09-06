# Kanso Config

This package allows you to easily include the values of a configuration
document into a kanso application.

## Install

Add to your project's kanso.json dependencies setting, here is the minimal
case:

```json
"dependencies": {
    "kanso-config": null
}
```

Run kanso install to install in your packages directory:

```
kanso install
```

## Configure

This is the default configuration:
```
"kanso-config": {
  "keyKey": "key",
  "valueKey": "value",
  "valuesKey": "values",
  "dataKey": "kanso-config",
  "showId": "config",
  "documentId": "config.js",
  "path": "config.js"
}
```

Include the generated config file into your HTML page:

```
 <script src="{baseURL}/config.js" type="text/javascript"></script>
```

This will read a document with the id `config.js` (change this by updating `documentId`) and the following structure:
```
{
  _id: 'config.js'
  values: [
    { key: 'key', value: 'value' },
    { key: 'key1', value: 'value1' }
  ]
}
```

You can then retrieve the configuration in the following way:
```
  var config = $.kansoconfig();
```

You can get particular keys:
```
  var value = $.kansoconfig('key'); // returns 'value'
  var miss = $.kansoconfig('miss'); // returns the key back, 'miss'
  var sansFallback = $.kansoconfig('miss', true); // returns undefined
```
