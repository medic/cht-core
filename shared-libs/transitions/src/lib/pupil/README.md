# Pupil
An easy and powerful string-based validation library.

This is __Pupil.js__, the JavaScript version of the library.  
A PHP version, Pupil.php, is planned.

**NOTE:** Update 1.2.0 changed the return format of validation results. See changelog below.

## Features
* Supports IE7+
* Supports Node.js
* Nested validation rules
* String-based validation rules for compatibility between different languages
* Light revalidation via caching

## Changelog
**1.2.0**

* Validation results are now returned as objects. See "Usage" below for more information.

**1.1.2**

* Undefined values now default to an empty string to avoid problems with validation functions using e.g. the toString() method for the value.

**1.1.1**

* Fixed a bug where rules without an associated value were not run at all, which caused the validator to not return anything for those rules. One issue caused by this was that non-supplied required fields didn't return that they didn't pass the validation.

**1.1.0**

* Changed the rule string syntax to follow C-like languages more closely and to prevent
headaches with further possible syntax additions. Strings, such as regex rule parameters, should now be quoted.

* Added ternaries: ```'condition ? thenRule : elseRule'```

* Changed the *email* validation function regex to a simpler one to improve validation performance.  
The new regex string should be appropriate for around 99% of cases.

## Installation
### Browser
Download `dist/pupil.min.js` and include it on your page.

### Node.js
Install the module:
```
npm install pupil
```
And then require it in your project:
```javascript
var pupil = require('pupil');
```

## Usage
The basic syntax is this:

```javascript
pupil.validate(rules, values);
```

Where `rules` and `values` are objects with matching keys. The rules are specified as `rule strings`; more information on those below.

For example:

```javascript
var rules = {
	name: 'min(3) && max(8) && regex("^[a-zA-Z]+$")',
	country: 'min(2)'
};

var values = {
	name: nameInputElem.value,
	country: countryInputElem.value
};
```

The two objects don't have to have identical keys, but values without a matching key in rules won't be evaluated at all.

The `validate()` method returns an object that has the following methods:

```javascript
isValid()   // Whether the validation was successful or not
hasErrors() // The opposite of isValid()
errors()    // Returns the fields that didn't pass validation
fields()    // Returns all of the fields and their validation results
```

## Rule strings
Rule strings are Pupil's primary method of specifying validation rules.

The syntax aims to mimic C-like languages. You can use logical operators (`&& (and)`, `|| (or)`, `! (not)`),
ternaries (`condition ? thenRule : elseRule`), nested "blocks" (`rule && (some || nested || rules)`) and validation
functions (`validationFunction("arg1", "arg2")`).

**String parameters for validation functions, such as the regex in the "regex" function, should be quoted.**  
Non-quoted parameters will be cast to floats (numbers with decimals).

For each validation function, there is also a matching function prepended by `other` that allows you to run functions
on other values than the one the rule string is for. This can be useful for fields that have differing requirements depending on another field. For example:

```javascript
{
	state: 'otherEquals("country", "US") ? lenMin(2) : lenMin(0)'
}
```

Validation function arguments can be either strings or numerical values. Numerical arguments should not be wrapped in quotation marks or apostrophes: ```lenMin(5)```.

## Validation functions
The following functions are available by default:
```
equals
iEquals      # A case-insensitive comparison
sEquals      # A strict comparison
siEquals
lenMin
lenMax
lenEquals
min
max
between
in           # Compare to a list of values
required
optional
numeric
alpha
alphaNumeric
email
regex        # Supply a custom regex
integer
equalsTo     # Compare to another field by its key
```

### Adding custom functions
You can use the following syntax to add your own validation functions:

```javascript
pupil.addFunction(name, callable);
```

Where callable should, at the very least, accept two arguments: `allValues` and `value`. `allValues` is an object containing every value that's being validated at the moment while `value` contains the value we're validating at the moment. Further arguments can be passed by rule strings like so:

```javascript
customFunction("arg1", "arg2")
```

The function names are case-insensitive.
