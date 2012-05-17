# Quick Install 

This document shuld help you quickly get Kujua software components installed,
including SMSSync, over a local wifi network.

## Download Couchbase

* Go here
[http://www.couchbase.org/get/couchbase-single/2.0](http://www.couchbase.org/get/couchbase-single/2.0)
* Click the Download button under Developer Preview to the right
* Click the right link for your operating system, use the `.zip` file if
you are on OSX, `.exe` on Windows.

## Create Admin User

After Couchbase installs it should bring up the [built-in admin tool](http://localhost:5984/_utils) (Futon).
Click the "Fix This" link in the bottom right.  And create a user:

* **Username**: root
* **Password**: (your secret)

## Configure CouchDB 

* Navigate Configuration section in Futon
* Scroll to **http** section
* Change `bind_address` to `0.0.0.0`

## Replicate Kujua (dev):

* Navigate to the Replicator screen in Futon 
* **Remote**: http://mandric.iriscouch.com/kujua-base
* **Local**: kujua
* Wait for replication to complete, should be less than 5 minutes.

## Download SMSSync to device:

Send one of these links to your device:

* Local Network: `http://local-ip-address:5984/kujua/_design/kujua-base/_rewrite/docs/install/gateway/SMSSync-kujua2-debug.apk`
* Internet: `https://medic.s3.amazonaws.com/downloads/gateway/SMSSync-kujua2-debug.apk`

Then open it in the browser on your device and then run the `.apk` file to complete the install.

## Configure the SMSSync settings

* Launch SMSSync and choose **settings**
* Update the Sync URL: `http://root:your-secret@local-ip-address:5984/kujua/_design/kujua-base/_rewrite/add`
* Choose **OK** to save

Note, in the full install document you will learn how to create a separate user
for the gateway so your root password is not compromised.

## Send a test SMS to the Gateway

* Send the following message to the gateway: `1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4`
* Verify that the message was forwarded and is parsed correctly by Kujua, by checking the Records and Downloads sections.

