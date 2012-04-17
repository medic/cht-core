## Users module

Functions for querying, creating, updating and deleting user documents.

Functions in this module follow the node.js callback style. The first
argument is an error object (if one occurred), the following arguments are
the results of the operation. The callback is always the last argument to a
function.


### API


#### delete(username, callback)

Deletes an existing user document, given its username. You
must be logged in as an administrative user for this function
to succeed.

* __username__ - _String_ - The username of the user to delete
* __callback(err,response)__ - _Function_ - Function called on completion of the operation

```javascript
users.delete('username', function (err) {
    if (err) // there was an error deleting the user
    else     // success
});
```


#### get(username, callback)

Get a single user by username. The third argument to the callback is an info
object which returns the authdb used, and the real id of the user with
"org.couchdb.user:" prefix.

* __username__ - _String_ - The username of the user to get
* __callback(err,user,info)__ - _Function_ - Function called on completion

```javascript
users.get('testuser', function (err, doc) {
    if (err) // there was an error fetching the user document
    else     // success
});
```


#### list([q], callback)

List users in the auth database. By default, it will list all users.
By using the optional `q` parameter, you can pass additional options to the
\_al\_docs` view for the auth database.

* __q__ - _Object_ - Query parameters (optional)
* __callback(err,list)__ - _Function_ - Function called with the resulting list (or error)

```javascript
users.list(function (err, list) {
    if (err) // there was an error querying the auth database
    else     // success
});
```


#### create(username, password, [properties], callback)

Creates a new user document with given username and password.
If properties.roles contains \_admin', user will be made admin.

* __username__ - _String_ - The username of the new user
* __password__ - _String_ - The unhashed password for the new user
* __properties__ - _Object_ - Additional properties such as roles to extend the user document with (optional)
* __callback(err,response)__ - _Function_ - Function called on completion or error

```javascript
users.create('testuser', 'testing', {roles: ['example']}, function (err) {
    if (err) // an error occurred
    else     // successfully created new user
});
```


#### update(username, password, properties, callback)

Updates an existing user document. Similar usage to the create function.

* __username__ - _String_ - The username of the new user
* __password__ - _String_ - The unhashed password for the new user
* __properties__ - _Object_ - Additional properties such as roles to extend the user document with (optional)
* __callback(err,response)__ - _Function_ - Function called on completion or error

```javascript
users.update('testuser', 'testing', {roles: ['example']}, function (err) {
    if (err) // an error occurred
    else     // successfully updated user
});
```
