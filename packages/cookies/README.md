## Cookies Module

Utility functions for reading and setting cookies in the browser and from
server-side CouchDB functions (lists, shows, updates etc).


### API


#### readBrowserCookies()

Read cookies currently stored in the browser, returning an object
keyed by cookie name.


#### readBrowserCookie(name)

Reads browser cookies and returned the value of the named cookie.

__Parameters__

* name _String_ - the name of the cookie to read


#### cookieString(req, opt)

Creates a string for storing a cookie on the browser.

__Parameters__

* req _Object_ - the CouchDB request object
* opt _Object_ - properties for the cookie (name, value, path, days)


#### setBrowserCookie(req, opt)

Sets a cookie on the browser, for use client-side only.

__Parameters__

* req _Object_ - the CouchDB request object
* opt _Object_ - properties for the cookie (name, value, path, days)


#### setResponseCookie(req, res, opt)

Creates a Set-Cookie header on a CouchDB response object. Returning the response
object with the updated Set-Cookie headers.

__Parameters__

* req _Object_ - the CouchDB request object
* res _Object_ - the CouchDB response object
* opt _Object_ - properties for the cookie (name, value, path, days)
