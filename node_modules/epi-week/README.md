epi-week
======

A tiny module to calculate the epidemiological week (also known as "epi week" or "CDC week") for any given date.

Usage
----

    var epi = require('epi-week');
    epi(new Date(2012, 11, 29)); // returns { week: 52, year: 2012 }
    epi(new Date(2012, 11, 30)); // returns { week: 1, year: 2013 }
    epi(new Date(2015, 0, 1)); // returns { week: 53, year: 2014 }


Installation
------------

    $ npm install epi-week

Development
-----------

  * [Twitter](http://twitter.com/wombleton)

Caveat
------

This package is in its infancy, use with caution.
