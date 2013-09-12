## Moment

A lightweight javascript date library for parsing, validating, manipulating, and formatting dates.

### Installation

Add `moment` to your dependencies section in `kanso.json`.

```javascript
  ...
  "dependencies": {
    "moment": null,
    ...
  }
```

> run `kanso install` to fetch the package

### Example usage

```javascript
  var moment = require('moment');
  ...
  var day = moment("12-25-1995", "MM-DD-YYYY");
  
  //milliseconds
  var date = new Date().getTime();
  console.log(moment(date).format("MM-DD-YYYY"));
```

### [Check out the website](http://momentjs.com)

### [Read the documentation](http://momentjs.com/docs/)

### [Run the unit tests](http://momentjs.com/test/)
