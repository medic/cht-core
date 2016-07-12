# Architecture of Medic Mobile instances

This page gives details on the different pieces of a Medic Mobile instance, how they interact and what they're used for.

## Overview

TODO : diagram of the whole thing
TODO : which repos are required for a minimum setup?

Medic Mobile instances are machines running [MedicOS](#medic-os), on which runs [medic-webapp](#medic-webapp) on a CouchDB server. In front of it there's [medic-api](#medic-api) (node api server) as an interface to the outside world, and nginx in front of that for load balancing.

On the server also runs [medic-sentinel](#medic-sentinel) (deprecated in v2, still there in legacy systems), a background helper.

There are two types of users : admin users (national or local managers, tech admins) which are online and use medic-webapp as a desktop interface, and Community Health Workers (CHWs) who are on mobile.

CHWs on android (v2) use medic-webapp wrapped in the [medic-android](#medic-android) container to look like a native app. Those on non-smart (I did not say dumb) phones (up to v0.4) send data in by SMS, either by typing them in directly, or through the [medic-collect] app, or through the Medic SimApp. In the future instances will allow both types of users.

[medic-reporter](#medic-reporter) is a helper tool for sending in reports without having to use real SMS. Not useful if your users are on android.

[medic-gateway](#medic-gateway) is an android app which serves as an SMS endpoint for sending and receiving messages. There's one per project, and it's hooked up to medic-webapp, which saves the messages coming in and gives it the messages that need to go out.

[Garden Dashboard](https://github.com/garden20/dashboard) is a CouchApp also running on prod instances. It connects to the online Garden Market where we push the new versions of the code, and pulls them from there.

[medic-analytics](#medic-analytics) is the stack for making analytics dashboards. It's on top of postgres (not couchdb) and uses Klipfolio.


## medic-os

Yes, we have an OS. How cool is that.

MedicOS is a lightweight linux-based OS, that's small enough to download in the remotest places. It ships with all the components to run a Medic Mobile instance.

If you're developing locally, you can run the components directly on your machine and don't need medic-os, see [Development Setup](https://github.com/medic/medic-webapp/#development-setup). It can be still be useful to [run medic-os on a VM](https://github.com/medic/medic-docs/blob/master/md/index.md) to make snapshots of your database, to work with different versions for instance.

## medic-webapp

Medic Mobile's brain. It's a [CouchDB](http://couchdb.apache.org/) app (see [Why did Medic Mobile chose CouchDB?]() TODO: link), built with [kanso](https://github.com/kanso/kanso).

The server code is a [couchapp](http://couchapp.readthedocs.io/en/latest/intro/what-is-couchapp.html). The client code, served by CouchDB, is in [AngularJS](https://angularjs.org/).

The UI looks like this :
TODO screenshot

## medic-api
A node server, serving as a front end for medic-webapp. It deals with authentication, authorization, and does some processing of requests when needed.

On prod systems, nginx runs in front of it for load balancing. You don't need nginx for developing locally.

## medic-sentinel
(before v2)
A node program that runs on the server, listens to changes and edit docs if needed. It's used to generate the schedule of outgoing messages to attach to an incoming report, to attach contact info to incoming reports, ...

If all your users are on android (which is the case right now for latest code, on 2016/07/12), you don't need sentinel.

## medic-android
Thin native container for medic-webapp to display on android.

In that case, the DB will be a local PouchDB, instead of CouchDB on server. The changes made on the user's PouchDB get replicated to the server with the Couch replication protocol.

## medic-collect
(before v2)
An android app based on [Open Data Kit](https://opendatakit.org/) to send reports in to medic-webapp over SMS or mobile data.



