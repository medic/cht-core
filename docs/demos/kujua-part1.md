# Part 1: Install/Setup

Hello and welcome to part one of a series of screencasts about Kujua, a SMS data collection tool designed for rural and occasionally connected environments.  Kujua focuses on easy of use and install, keeping infrastructure requirements to a minimum.  This is screencast will take you through a basic install of Kujua.

    show published kujua url
    https://medic.iriscouch.com/kujua-base/_design/kujua-base/_rewrite/

Right now as we speak Kujua is in development, we have not published a release yet but we do make the development version available publicly at this URL.

Now unlike most web applications you see nowadays, we are not going to login directly to this site, instead we are going to install a copy of it on our local instance of CouchDB using a pretty neat feature called replication.  Lets take a look at the install doc.

    [ navigate to install doc ]

We are skipping most this, and for this demo I'll assume you have CouchDB installed and have some users setup. So we can skip the first part and jump into replication.

    [ navigate to Install Kujua 1. Replication ]

Let's follow along here to get our local copy running.

    [ follow replication steps in doc ]
    [ open new tab navigate to futon screen ]
    [ …. ]
    [start replication per install docs ]

The replication should take about 30 seconds to complete.

Why replicate? Well because we want you to own all your data, and ideally we think you should have direct local access to all your tools. Rather than host your data in a central location, CouchDB makes it easy to keep multiple copies of the data and the application running in multiple places, so that's what we mean by distributed.  We try to keep the data as close to the user as possible, which allows the data to be used in offline scenarios, and builds in redundancy to your processes.  In some ways similar to distributed version control like github.

    [ optional: talk about CouchDB to fill space ]

CouchDB is a distributed document based database.  It's an open source project run by the Apache Software Foundation.  It allows you to store and distribute your data fairly easily.  It also provides us with all the infrastructure we need to run a web application, namely a database, web server and application server.  We <3 CouchDB.

    [ waiting for replication to complete! ]

So you can see here two documents were transferred.

    [ point out documents transferred ]

But lets have a closer look.
    
    [ navigate to overview then kujua db in futon ]

So in CouchDB-land these are called 'design docs' or couchapps.   We have two, one is a utility called kujua-phoney that allows us to submit data to kujua and simulates the tasks of our SMS gateway. The other is kujua itself.  

    [ click on _design/kujua-base document ]
    [ scroll through document ]

A couchapp contains all the code and logic of the web application.  Since CouchDB stores everything using the JSON format it's bundled as a JSON document.

Ok so lets navigate to our local copy of Kujua!

    [ navigate to http://localhost:5984/_design/kujua-base/_rewrite/ ]

So now we have a Kujua running locally.  Here is the basic screen when you are logged in as an an admin and there are not other records yet.  You can see here I'm logged in as the user root, which is the admin user I created when I installed couchDB.

    [ point to upper right tab with mouse ]

Let's send in a message to see if the pipes are clean!  We can do this by going to the gateway testing document, 
   
    [ navigate to gateway testing doc ]
    [ copy example message ]

then just copy and paste an example text message from that document into kujua-phoney.

    [ paste into phoney press send ]
    [ navigate to records screen and expand record ]

Yay, it works.
