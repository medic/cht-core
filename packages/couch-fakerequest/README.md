## Couch FakeRequest

Utilities for calling show, list and update functions using test data.
Creates a test environment with the global functions expected by the
CouchDB JS view server.


### API


#### show(showfn, doc, req)

Run show function. The response will always be converted to an
object, if a string is returned the object will be {body: <string>}

* __showfn__ - _Function_ - the show function to call
* __doc__ - _Object_ - the JSON doc to pass to the show function
* __req__ - _Object_ - the request object to pass to the show function


#### list(listfn, viewdata, req)

Run list function. Converts the JSON returned from a view into a
head object to pass to the list function and hooks up the global
getRow function to shift values off the rows property.

* __listfn__ - _Function_ - the list function to call
* __viewdata__ - _Object_ - data returned by the view to use
* __req__ - _Object_ - the request object to pass to the list function


#### update(updatefn, doc, req)

Run update function. The response (second item in the returned array)
will always be converted to an object, if a string is returned the
object will be {body: <string>}.

* __updatefn__ - _Function_ - the update function to call
* __doc__ - _Object_ - the JSON doc to pass to the update function
* __req__ - _Object_ - the request object to pass to the update function
