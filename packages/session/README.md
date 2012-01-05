## Session module

This module contains functions related to session management. Logging in,
logging out and checking the current state of a user's session.

Functions in this module follow the node.js callback style. The first
argument is an error object (if one occurred), the following arguments are
the results of the operation. The callback is always the last argument to a
function.


### Events

The session module is an EventEmitter. See the
[events package](http://kan.so/packages/details/events) for more information.

#### change

Emitted whenever a change to the user's session is detected, this
can occur as the result of a login/logout call or by getting the user's
session info (and it's changed).

```javascript
var session = require("session");

session.on('change', function (userCtx) {
    // update session information, eg "Logged in as ..."
});
```


### API


#### login(username, password, callback)

Attempt to login using the username and password provided.

* __username__ - _String_ - the username to login with
* __password__ - _String_ - the user's password (unhashed)
* __callback__ - _Function_ - function called with the result of the login attempt

```javascript
session.login('testuser', 'password', function (err, response) {
    if (err) // an error occurred logging in
    else     // success
});
```


#### logout(callback)

Logs out the current user.

* __callback__ - _Function_ - function called with the result of the logout attempt

```javascript
session.logout(function (err, response) {
    if (err) // an error occurred logging out
    else     // success
});
```


#### info(callback)

Returns the current user's session information. The info object contains a
`userCtx` property and an `info` property. The first contains the name and
roles of the current user, the second contains information about the user
database and authentication handlers.

* __callback__ - _Function_ - function called with the session information

```javascript
session.info(function (err, info) {
    if (err) // an error occurred getting session info
    else     // success
});
```
