# Synopsis
A wide purpose tokenizer for JavaScript. The interface follows more or less
the WriteStream from [node.js](http://nodejs.org).

node-tokenizer is published on npm so you can install it with `npm install tokenizer`

## How to

* require the Tokenizer constructor

``` javascript
var Tokenizer = require('tokenizer');
```

* construct one (we'll see what the callback is used for)

``` javascript
var t = new Tokenizer(mycallback);
``` 

* add rules

``` javascript
t.addRule(/^my regex$/, 'type');
```

* write or pump to it

``` javascript
t.write(data);
// or
stream.pipe(t);
```

* listen for new tokens

``` javascript
t.on('token', function(token, type) {
    // do something useful
    // type is the type of the token (specified with addRule)
    // token is the actual matching string
})
// alternatively you can listen on the 'data' event
```

* look out for the end

``` javascript
t.on('end', callback);
```

the optional callback argument for the constructor is a function that will
be called for each token in order to specify a different type by returning
a string. The parameters passed to the function are token(the token that we found)
and match, an object like this 

``` javascript
{
    regex: /whatever/ // the regex that matched the token
    type: 'type' // the type of the token
}
```

Have a look in the example folder

## Rules
rules are regular expressions associated with a type name.
The tokenizer tries to find the longest string matching one or more rules.
When several rules match the same string, priority is given to the rule
which was added first. (this may change)

Please note that your regular expressions should use ^ and $ in order
to test the whole string. If these are not used, you rule will match _every_
string that contains what you specified, this could be the whole file!

## To do
* a lot of optimisation
* being able to share rules across several tokenizers
    (although this can be achieved through inheritance)
* probably more hooks
* more checking
