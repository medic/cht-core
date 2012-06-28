# Install

## Intro

This guide should help you install two main parts of the Medic toolset: Kujua
and SMSSync.  SMSSync is an Android application that receives SMS data and
sends it to a web service via HTTP.  Kujua provides the web service as well as
a web interface to manage your data.  This setup typically used to in
combination with unstructured or structured SMS messages to collect data.

## Install CouchDB

Kujua requires **CouchDB version 1.2**.

### Step 1: Download 

* Choose the right package for your operating system on [CouchDB Site](https://couchdb.apache.org)
* Launch or extract the package file and follow the instructions for your operating system to install CouchDB.

### Step 2: Create Admin User

The first thing you should do with any CouchDB database is setup an admin
account if it does not have one.  You will need to think of a decent password.
This account has full privileges on the database.

* Navigate your browser to Futon, the CouchDB admin tool, by default it can be found at <http://localhost:5984/_utils/>.
* Click the **Fix this** link in the bottom right to show the admin create screen.
* Enter the username **root** and a your password.
* Click **Create**
* Save the password somewhere so you remember it.

![Fix this](img/fix_this.png)

### Step 3: Require Valid User

We recommend you restrict all access to your database to authenticated users.
Change the `require_valid_user` configuration setting.

* Click **Configuration** in the right column in Futon.
* Click the `false` value in the **couch\_httpd\_auth** section.  
* Replace the `false` text with `true` and press the enter key.

![Require Valid User](img/require_valid_user.png)
![Set Require Valid User True](img/require_valid_user_true.png)

### Step 4: Create Additional Users

We do not want everyone using the root account so lets create some other less
privileged accounts. Typically we create at least one for the gateway to use.
Once the user document is generated edit the
[_users](http://localhost:5984/_utils/database.html?_users) database to create
it. 

<form class="form-inline" id="createuser">
<span class="control-group">
<input type="text" value="gateway" name="username" class="span2">
</span>
<span class="control-group">
<input type="text" placeholder="password" name="password" class="span2">
</span>
<button type="submit" class="btn">Generate</button>
</form>
<pre id="createuser-output" class="hide"/>

*Note* remember to keep your account usernames and passwords stored somewhere safe.

## Install Kujua

Since Kujua is just a CouchApp the easiest way to install is by replicating
from another instance of CouchDB.

### Step 1: Replicate 

* Navigate your browser to Futon.
* Click the **Replicator** item in the right column under Tools.

![Replicator Screen](img/replicator.png)

On the Replicator screen complete the following fields and their corresponding values:

* Replicate Changes from: **Remote Database** `https://medic.iriscouch.com/kujua-base`
* to: **Local Database** `kujua`
* Click the **Replicate** button
* After you click replicate verify your screen updates with the replication session data:

![Replicator Success](img/replicator_success.png)

* Verify you can navigate to the home screen:
<http://127.0.0.1:5984/kujua/_design/kujua-base/_rewrite/>, you should see the following:

![Kujua](img/kujua_base_localhost.png)

## Verify Network Configuration

The next section explains how to find your local network IP address, more
specifically the network address that CouchDB is listening on.  In this guide
we assume there are two devices on **the same IP network**, this is typically a
laptop and phone on a secured LAN via wireless or USB tethering.  

### Step 1: Listen to all networks

Typically we want to bind CouchDB to all available network interfaces on the
machine.  This allows CouchDB to communicate on the internet or your local
network.  For security CouchDB is shipped to only listen to localhost, so only
the machine it is running on can access it.

* Navigate to the **Configuration** section in Futon and  find the **httpd** section
* Change `bind_address` to `0.0.0.0`

![Bind to all networks](img/bindaddress.png)

### Step 2: Verify your IP address

On Windows the easiest way to find your IP address is:

* Start a command window by navigating to **Start > Run** then type ```cmd``` and choose **OK**.

![Run Command](img/run_cmd.png)

* Type ```ipconfig``` and hit return.  

![ipconfig output](img/ipconfig_output.png)

This should provide you with an IP address on the local network.  We assume you
know enough about your system to find this piece of common information if not
on Windows.

### Step 3: Verify CouchDB is listening

Now to verify CouchDB is listening on a network address you can use your web
browser.  

* Type the IP address into the browser address bar and **append the following port number** prefaced with a colon ```:5984```. In this example the complete address is ```http://10.10.20.105:5984```.
* You will be prompted for a password again since you are now using a different URL.
* Enter the root username and password.
* Verify you see a status message from CouchDB.

![CouchDB heartbeat](img/test_network_address.png)

### Step 4: Verify Kujua is listening

* Now append the following path to it:
  ```/kujua/_design/kujua-base/_rewrite/```.<br /> In this example we use 
  ```http://10.10.20.105:5984/kujua/_design/kujua-base/_rewrite/```.
* Verify that Kujua responds with a similiar screen (there will be some difference between versions) to the one below.
* Now **copy and paste your local network URL somewhere**, possibly in the
clipboard or notepad.  You will need it when you configure the Gateway Sync URL soon.

![Verify Kujua](img/verify_kujua.png)

## Install SMSSync

At the time of this writing we are using a modified version of [SMSSync by
Ushahidi](http://smssync.ushahidi.com/) as the gateway; your device needs to run Android version 2.2 or higher.

### Step 1: Allow Installation of non-Market Applications 

* On your device navigate and enable **Settings > Applications > Unknown Sources**

![Settings Top](img/settings_top.png)
![Unknown Sources](img/unknown_sources.png)

### Step 2: Download SMSSync to Device


* Copy this link address: [SMSSync 1.1.9-kujua.2](https://medic.s3.amazonaws.com/downloads/gateway/SMSSync-kujua2-debug.apk)\*
* Send the URL to the device either through SMS, email or other 
means, then open it in your Android browser.  You can type it manually into the
address bar too.
* Choose **Accept** when Android prompts you to download.  The file is approximately 200KB and should download to your SD Card pretty quickly.

![Select Link in SMS](img/sms_select_link.png)
![Select Action](img/select_action.png)
![Browser Loading](img/browser_loading.png)

\* Checksums: 
[md5](gateway/SMSSync-kujua2-debug.apk.md5),
[sha](gateway/SMSSync-kujua2-debug.apk.sha)

*Note* We also include a copy with Kujua available locally in case you do not have internet access at the time of install. [SMSSync 1.1.9-kujua.2](gateway/SMSSync-kujua2-debug.apk)

### Step 3: Install SMSSync on Device

* Open your browser and go to settings
* Choose the **More** option
* Choose **Downloads** from the menu
* Choose **SMSSync-kujua** package from the download history

![Browser More Option](img/browser_more.png)
![Browser Downloads](img/browser_downloads.png)
![Choose SMSSync from download history](img/download_history.png)

* Choose **Install** from the SMSSync menu
* Wait a few seconds for the application to install
* Choose **Open** from the SMSSync menu

![Install SMSSync](img/install_smssync.png)
![Installer Screen](img/installing_smssync.png)
![Choose Open SMSSync](img/open_smssync.png)

## Configure SMSSync

### Step 1: Enter the Sync URL

Now configure SMSSync with the URL to our Export application:

* Launch SMSSync and Edit Settings
* Choose **Enter the Sync URL** option
* Enter your gateway username and password similar to this `gateway:secret@`, so it is separated by a colon and ending with the at symbol.
* Enter the local network URL you discovered in the Verify Network steps above and **append one more part**: `add`.  Complete example: `http://gateway:secret@10.10.20.105:5984/kujua/_design/kujua-base/_rewrite/add`.
* Choose **OK**

![Configure URL](img/smssync_config.png)
![Input URL](img/smssync_config_user.png)
![Input URL](img/smssync_config_url.png)

### Step 2: Configure a few more options

* Choose **Start the SMS gateway**.  You will see a status icon in the notifications bar that tells you it is running.
* Scroll down a bit further and set **Get Reply From Server** so the person submitting the report gets a messaging confirming it was received.
* Finally set **Enable Task Checking** so the gateway processes outgoing messages.

![Start](img/smssync_start.png)
![Get Reply From Server](img/smssync_getreply.png)
![Enable Task Checking](img/enable_task_checking.png)


#### Language/Locale parameter

The gateway processes responses from Kujua so it is important that these
responses are in the correct language and locale.  If you want to specify your
locale, you can append the `locale` query parameter to the sync URL above.  The
default locale is english or `en` and we also support `fr` at the moment.  

For example, to get responses from Kujua in french use
`http://gateway:secret@10.10.20.105:5984/kujua/_design/kujua-base/_rewrite/add?locale=fr`.

## Test the Pipes

Now the setup should be complete,  let's see the fruits of our labor.

### Step 1: Sync Tests

* With SMSSync running and on the main screen where you can see **Sent** and
  **Pending** tabs, send a SMS message to the Android device from another phone.
* Observe the Android phone receive the message in the notification bar.
* Observe the **SMSSync Message Sent** notice.
* Choose the **Sent** tab and notice your message in the Sent box.
* Send another message but using a special **Report format**,<br />
  `1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4`.
* Observe your report data in the Sent box again.

![Input URL](img/test_received.png)
![Start](img/test_sent.png)
![Report Received](img/report_received.png)

*Note*, if messages are in the Sent box that means they were successfully synced or 
saved to CouchDB.  If they remain in Pending then there is likely a problem, usually the first place to look is the [CouchDB log](http://localhost:5984/_log?bytes=50000).

### Step 2: View Response

* You should also receive a response SMS from the gateway, like **Zikomo!**

*Note*, our version of SMSSync does not send SMS responses to itself because this can
cause an endless loop of error responses to and from the gateway.

### Step 3: View Form Data

If the message was sent correctly you should see the parsed output form the test form.

* Browse to the **Records** screen
* Click on the record to expand and view your parsed form data and verify it looks correct.

![Records Screen](img/records_screen.png)

#### Woot! We got data! Crack open a beer.

## Facility Data

Notice in the previous step the records is **not valid**, this is because a
facility could not be associated with the message, or more specifically the
sender's phone number.  We can fix this by creating a facility for it.

### Step 1: Create Facilities

* Navigate to the Facilities screen and click on the **District** tab
* Create a district

![Create District](img/create_district.png)

* Then Create a Health Center and associate with the District

![Associate with District](img/associate_district.png)

* Then Create a Clinic and associate with a Health Center 
* Take note that the **Contact Phone must match** in order for the record to be created correctly.

![Enter Phone Number](img/enter_phone_number.png)

### Step 2: Resend Form Data

* Now resend the form data, you should get a valid record!

![Valid Record](img/valid_record.png)

### Step 3: Download Report Data

Now lets see if we can get our data out of the database and in a useful format.

* Browse to the Downloads screen
* Select the download format your prefer
* Click the **Download button** and a file should download to your computer.

![Export Screen](img/export_screen.png)

* Now open the file in your favorite spreadsheet program and verify the
  formatting, field names and data look accurate.

![CSV Output](img/csv_output.png)

