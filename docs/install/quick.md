# Quick Install 

This document should help you quickly get Kujua software components installed,
including SMSSync, over a local wifi network.

## Download CouchDB

* Go to [couchdb.apache.org](http://couchdb.apache.org) and download the right file for your operating system
* Open the install file and follow the instructions.

## Create Admin User

After CouchDB installs it should bring up the [built-in admin tool](http://localhost:5984/_utils) (Futon).
Click the "Fix This" link in the bottom right.  And create a user:

* **Username**: root
* **Password**: (your secret)

## Configure CouchDB 

### Listen to all networks

* Navigate to **Configuration** section in Futon
* Scroll to **http** section
* Change `bind_address` to `0.0.0.0`

### Require Valid User

* Click **Configuration** in the right column in Futon.
* Click the `false` value in the **couch\_httpd\_auth** section.  
* Replace the `false` text with `true` and press the enter key to save the config.

## Replicate Kujua (dev):

* Navigate to the Replicator screen in Futon 
* **Remote**: http://medic.iriscouch.com/kujua-base
* **Local**: kujua
* Wait for replication to complete, should take less than a minute on a decent connection.

## Download SMSSync to device:

Send one of these links to your device:

* Local Network: `http://local-ip-address:5984/kujua/_design/kujua-base/_rewrite/docs/install/gateway/SMSSync-kujua2-debug.apk`
* Internet: `https://medic.s3.amazonaws.com/downloads/gateway/SMSSync-kujua2-debug.apk`

Then open it in the browser on your device and then run the `.apk` file to complete the install.

## Configure the SMSSync settings

* Launch SMSSync and choose settings on the device to display the SMSSync settings menu
* Update the Sync URL: `http://root:your-secret@local-ip-address:5984/kujua/_design/kujua-base/_rewrite/add`
* Choose **OK** to save

Note, in the full install document you will learn how to create a separate user
for the gateway so your root password is not compromised.

## Send a test SMS to the Gateway

* Use some of the examples in the [gateway testing doc](../testing) to verify messages are being displayed and parsed correctly in Kujua.

