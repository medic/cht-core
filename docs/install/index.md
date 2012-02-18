# SMS Data Collection Setup

## Intro

This guide will help you install two main components of the Medic platform:
Kujua Export and SMSSync.  This is the minimal setup you need for basic data
collection via SMS.  SMSSync is an Android application that receives SMS data
and automatically pushes or syncs the data using HTTP to another service.
Kujua Export allows you to get data out of the database in a format that a
spreadsheet program can read.

## Install Kujua Export

The export tool requires CouchDB and provides a few things under the hood: a
web interface, form definitions, and a parser.  It exports the data into
useable formats compatible with programs like Excel. 

### Step 1: Install CouchDB

Kujua requires CouchDB version 1.1 or higher.  We are currently using the
Couchbase Single Server binaries.  Couchbase packages CouchDB to make it very
easy to install on any modern operating system.  

* Click the **Download** button on [Couchbase Single Server 2.0 Preview](http://www.couchbase.org/get/couchbase-single/2.0)
* Choose the right file for your operating system, if you are using Windows for example, download the .exe file.
* Launch or extract the package file and follow the instructions for your operating system to install Couchbase Single Server.

*Note* throughout this guide I refer to *CouchDB* and *Couchbase Single Server* synonymously.

### Step 2: Navigate to Replicator Screen

* Launch CouchDB
* Navigate your browser to Futon, the CouchDB admin tool, by default it can be found at <http://localhost:5984/_utils/>. 
* Click the **Replicator** item in the right column under Tools. 

![Replicator Screen](img/replicator.png)

### Step 3: Replicate the Export Tool

On the Replicator screen complete the following fields and their corresponding values:

* Replicate Changes from: **Remote Database** ```https://medic.iriscouch.com/kujua-export```
* to: **Local Database** ```kujua``` (\*note below)
* Click the **Replicate** button
* After you click replicate verify your screen updates with the replication session data:

![Replicator Success](img/replicator_success.png)

*Note* your database name may vary if you have an existing installation.

### Step 4: Verify

As a final step to verify you have Kujua Export installed, navigate to the kujua-export design doc: <http://127.0.0.1:5984/_utils/document.html?kujua/_design/kujua-export>, you should see the design doc:

![Kujua Design Doc](img/kujua_designdoc.png)




## Verify Network Configuration

The next section explains how to find your local network IP address, more
specifically the network address that CouchDB is listening on.  In this guide
we assume there are two devices on **the same IP network**, this is typically a
laptop and phone on a secured LAN via wireless or USB tethering.  

### Step 1: Verify your IP address

On Windows the easiest way to find your IP address is:

* Start a command window by navigating to **Start > Run** then type ```cmd``` and choose **OK**.

![Run Command](img/run_cmd.png)

* Type ```ipconfig``` and hit return.  

![ipconfig output](img/ipconfig_output.png)

This should provide you with an IP address on the local network.  We assume you
know enough about your system to find this piece of common information if not
on Windows.

### Step 2: Verify CouchDB is listening

Now to verify CouchDB is listening on a network address you can use your web
browser.  

* Type the IP address into the browser address bar and **append the following port number** prefaced with a colon ```:5984```. In this example the complete address is ```http://10.10.20.105:5984```.
* Verify you see a status message from CouchDB.

![CouchDB heartbeat](img/test_network_address.png)

### Step 3: Verify the Export tool

* Now append the following path to it:
  ```/kujua/_design/kujua-export/_rewrite/```.<br /> In this example we use 
  ```http://10.10.20.105:5984/kujua/_design/kujua-export/_rewrite/```.
* Verify that the Export app responds with a screen similiar to the one below.
* Keep this URL handy, you will need it for the next step.

![Verify Export Tool](img/verify_export.png)

## Install SMSSync

At the time of this writing we are using a modified version of [SMSSync by
Ushahidi](http://smssync.ushahidi.com/) as the gateway; your device needs to run Android version 1.6 or higher.

### Step 1: Allow Installation of non-Market Applications 

* On your device navigate and enable **Settings > Applications > Unknown Sources**

![Settings Top](img/settings_top.png)
![Unknown Sources](img/unknown_sources.png)

### Step 2: Download SMSSync to Device

<a href="gateway/SMSSync-kujua.1-debug.apk" class="btn btn-primary">Download SMSSync 1.1.9 Kujua.1</a>
[[md5]](gateway/SMSSync-kujua.1-debug.apk.md5)
[[sha]](gateway/SMSSync-kujua.1-debug.apk.sha)

* Take the URL you discovered in the previous step and append the gateway download path to it, `install/gateway/SMSSync-kujua.1-debug.apk`.<br />
Complete example: `http://10.10.20.105:5984/kujua/_design/kujua-export/_rewrite/install/gateway/SMSSync-kujua.1-debug.apk`
* Send the gateway download URL to the device either through SMS or email, then
open it in your Android browser.  *Note*, you can type it manually into the
address bar too.  
* Choose **Accept** when Android prompts you to download.  The file is approximately 200KB and should download to your SD Card pretty quickly.

![Select Link in SMS](img/sms_select_link.png)
![Select Action](img/select_action.png)
![Browser Loading](img/browser_loading.png)

*Note* there are other ways to get the apk file onto your device, this was the easiest I have found.

### Step 3: Install SMSSync on Device

To install the application you have to find the apk file on your SD Card.  

* Use the native file manager to navigate to the **SD Card > Downloads** portion of the file system and choose the apk filename you downloaded in the previous step.
* Choose **Install** when Android prompts you.

*Note* if you do not have a file manager there are several free applications available on the Android Market.

## Configure SMSSync

### Step 1: Enter the Sync URL

Now configure SMSSync with the URL to our Export application:

* Launch SMSSync
* Edit Settings
* Choose **Enter the Sync URL** option
* Enter the Kujua Export URL you discovered in the previous step and **append one more part**: `add`.  Complete example: `http://10.10.20.105:5984/kujua/_design/kujua-export/_rewrite/add`.
* Choose **OK**

![Edit Settings](img/smssync_settings.png)
![Configure URL](img/smssync_config.png)
![Input URL](img/smssync_config_url.png)

### Step 2: Configure a few more options

* **Start the SMS gateway**.  You will see a status icon in the notifications bar that tells you it is running.
* Finally scroll down a bit further and set **Get Reply From Server** so the person submitting the report gets a messaging confirming it was received.

![Start](img/smssync_start.png)
![Get Reply From Server](img/smssync_getreply.png)
![Enable Task Checking](img/enable_task_checking.png)

*Note:* the URL is difficult to enter manually, it is less error prone to email or sms the URL to the device so you can copy and paste it into the SMSSync dialogue box.

If you got this far without any error messages, great!  You are on the home stretch.

#### Language/Locale parameter

The gateway processes responses from Kujua so it is important that these
responses are in the correct language and locale.  If you want to specify your
locale, you can append the `locale` query parameter to the sync URL above.  The
default locale is english or `en` and we also support `fr` at the moment.  

For example, to get responses from Kujua in french use
`http://10.10.20.105:5984/kujua/_design/kujua-export/_rewrite/add?locale=fr`.

## Test the Pipes

Now the setup of the Gateway and Export tools should all be complete.  Let's
see the fruits of our labor in action; this should also help us understand how
it all fits together.

### Step 1: Sync Tests

* With SMSSync running and on the main screen where you can see **Sent** and
  **Pending** tabs, send a SMS message to the Android device from another phone.
* Observe the Android phone receive the message in the notification bar.
* Observe the **SMSSync Message Sent** notice.
* Choose the **Sent** tab and notice your message in the Sent box.
* Send another message but using a special **Report format**,<br />
  for example, ```1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4```.
* Observe your report data in the Sent box again.

![Input URL](img/test_received.png)
![Start](img/test_sent.png)
![Report Received](img/report_received.png)

*Note*, if messages are in the Sent box that means they were successfully synced or 
saved to the database.

*Note*, our version of SMSSync won't send SMS responses to itself because this can
cause an endless loop of error responses to and from the gateway.

### Step 2: View Report Data

Now lets see if we can get our data out of the database and in a useful format; the Export tool does this.

* Browse to the export tool
* Choose the **PSMS: Download CSV** link, a file should download to your computer.

![Export Screen](img/export_screen.png)

* Now open the CSV file in your favorite spreadsheet program and verify the
  formatting, field names and data look accurate.

![CSV Output](img/csv_output.png)

