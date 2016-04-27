# Medic Mobile Release Notes

## 2.6.2

### Apr 28, 2016

- Update PouchDB to improve replication reliability and performance. Issue: #2134 #2167
- When editing a CHP Area, previously set values for CHP, Branch, and Supervisor do not show up. Issue: #2223
- Dropdowns in CHP Area create and edit forms have no blank option. Issue: #2227
- Ensure roles are always available on user-settings. Issue: #2199

## 2.6.1

### Apr 21, 2016

- User's fullname is not showing up in /configuration/users. Issue: #2200
- Deleted documents cause sentinel log spam. Issue: #1999
- Disable nools for unrestricted users. Issue: medic-projects#149
- Update libphonenumber and use strict validation. Issue: #2159 #2196
- Contacts export response garbled. Issue: #2187

## 2.6.0

### Apr 5, 2016

This release contains breaking changes from 0.x versions. Updating from 0.x versions may result in the application no longer operating as expected.

- The app can now be used offline and synced back to the server later.
- Added an android app for accessing the webapp from mobile.
- Added Tasks feature for rich event scheduling.
- Forms can now be provided in XForm format for rich form UIs.
- Added a configurable Target analytics module.

## 0.4.11

### Feb 4, 2016

- Security fix for leaking auth info.

## 0.4.10

### Nov 16, 2015

- Added support for Outgoing Deny List, a comma separated list of phone numbers
  or strings to deny outgoing service to. #750

- Fixed bug in records export. #1273

- Fixed bugs in uniqueWithin validation. medic-sentinel#74

- Added link to Help page in main menu.

## 0.4.9

### Aug 26, 2015

- Fixed bug on node 0.12 in felix-couchdb. #1145

- Improved error handling when notifications (start/stop) configs are
  misconfigured. #1144

- Fixed bug in `exists` validation where it fails on some unicode characters. #1147

- Fixed Reporting Rates interface that was neglected and broken. #1030

- Fixed bug in exporting data by date, it's now inclusive. #1104

## 0.4.8

### Jul 14, 2015

- Added SMS parser fixes from dev branch:
   
  - parse string fields with exclamation marks
  - compact textforms format handles quotes in quotes

- Fixed export bug when using lowercase form codes. Please re-upload your forms
  so they are formatted correctly. #998

- Fixed bug where exporting yields same result with or without date
  filter. #1059, #1031

## 0.4.7

### Jun 16, 2015

- Fixed ODK forms list bug when the list is empty. Issue #886

- Fixed compact textforms parser bug with exclamation points. Issue #989

- Fixed bug in compact textforms parser we ignored fields with uppercase
  letters in the key of the form definition.  Issue #991

- Fixed bug when creating record with empty message. Issue #990

- Moved raw message to bottom of report body.  Issue: #927


## 0.4.6

### Jun 4, 2015

- Improved boolean expression evaluation in registration configuration.

## 0.4.5

### May 28, 2015

- Fixed bug in schedules editor for LMP (last menstrual period) based
  schedules. #973
    
- Initial support for messages, records and forms API.  See
  https://github.com/medic/medic-api/blob/master/API_v1.md

## 0.4.4

### May 21, 2015

- Added support for a new messages parser we're calling Javarosa prefixed with
  the `J1` format code. 

## 0.4.3

### Feb 26, 2015

#### Features

- Major UI enhancements #370

  - Inbox Style with advanced search bar
  - Admin Panels
  - Mobile device support

- Configurable date format #577

- Built-in ANC Analytics #586

- Easy user feedback mechanism #19

- Added help and tour

- Refactored build process, added grunt, bower and jshint.

- No forms are included by default.  You must upload your forms.  As usual
  configuration (settings and forms) persists through upgrades.

- Added new translations

- Default auto-replies

- There are now two ways to export stuff: 1) from the reports screen click on
  export, or 2) on the Configuration > Export screen. The former is simplified
  and has no way of changing facility, form, or file format. The latter is
  functionally equivalent to 0.4.2.

#### Upgrade Notes

- CouchDB Lucene >= 1.0.2

- Gardener >= 1.1.0 

- New [Nginx configuration](https://github.com/medic/medic-os/blob/3aedf0622eb0669aee2e5bbfba95a42faf05b9da/platform/packages/medic-core/settings/medic-core/nginx/nginx.conf), close or redirect port 5984, proxy all requests through medic-api.


## 0.4.2

### Sep 4, 2014

- Fixed bug: When searching for a patient identifier using the free-text search feature, results were not returned properly. Index the field appropriately.

## 0.4.1

### Jul 31, 2014

- Minor UI clean up.

- Allow hash symbol to separate form code and data in structured textform message.

- Modified build to bundle npm dependencies with attached node modules.

## 0.4.0

### Jul 10, 2014

#### New Features

- User interface for common settings and translations #484

- User interface to configure basic ANC messaging workflows #487

- Nodejs module for API calls and to handle audit transactions

- Better language support on messages throughout configuration. e.g. you can
  define a reminder schedule using multiple languages and the right language
  will be used based on the locale of the message.  #486

- Added support to configure locales through settings screen #491

- Added support for custom forms and uploading JSON form definitions #283

- Supporting old/obsolete settings via migrations during restore #501

- Support minute setting for scheduled hours configuration

- Reduced files size of design doc by minifying javascript and combining files

- Added support for unique validations across multiple fields. #412

- External IDs can be added to facilities on the facility page.  #503

- Added `columns` query parameter to allow callers to messages and data_records
  exports to retrieve specific columns in a specific order. #503

- Added Patient ID field to default data record export

- Allow specifying of task columns in message export. 

  To include the group column, include the parameter `columns=["task.group"]`
  (and any other columns you need, eg: `patient_id`). #432

- Allow range searches on number fields in lucene. #481

#### Bug fixes

- Fixed bug stopping district admins from being able to delete documents. #509

- Corrected language Nepalese to Nepali

- Fixed too many requests for app_settings #511

- Fixed saving user password, was getting reset/wiped #509 

- Render facilities controls on all facilities tabs. #338

#### Deprecated and Backwards Incompatible changes

- deprecated `exclude_cols` parameter for export integrations. Migrate 
  applications to use the `columns` parameter instead.

- No forms are included by default, you must upload your forms. As usual
  configuration (settings and forms) persists through upgrades.


## 0.3.11

### Jun 19, 2014

- Fixed bug where scheduled messages were out of order on Chrome #527

- Fixed bug where app settings was ignored, and the app reverted to defaults. #524

- Added delivery form to generic ANC forms.

- Modified behavior of patient reports when `silence_for` option is empty we
  clear the entire schedule instead of a group.

- Fixed notifications to add the configured response #508

- Fixed bug and added support for multiple schedules in schedule silencing
    
    When `silence_for` is specified we should only silence/clear one group, I
    introduced a bug a few commits ago that would ignore the group and
    silence/clear based on date. Use the `silence_for` window to match and
    clear the first group.
    
    Also added support for comma separate string on `silence_type` option.
    In the MCH case we have two schedules that can be generated depending on
    the form submission/registration: ANC Reminders and ANC Reminders LMP.
    Now both schedules can be cleared with a single ANCV settings entry.


## 0.3.10

### Jun 12, 2014

- updated intrahealth-senegal forms


## 0.3.9

### May 22, 2014

- fixed a bug in settings parser, to conform to the latest app-settings
  changes, otherwise configs never get triggered.

## 0.3.8

### May 22, 2014

- fixed bug in messages export filters to include all data records,
  unstructured messages were being ignored. #502

- added support for app-settings kanso package.
        
    Saving settings in dashboard was too slow for use because entire ddoc was
    being updated.  Using app-settings API fixes that.


## 0.3.7

### May 13, 2014

- Modified KEMRI form fields to be ordered the same as KEMR form.


## 0.3.6

### Apr 28, 2014

- Fixed bug in updating duplicate scheduled reports #483


## 0.3.5

### Apr 16, 2014

- Major bug fix that was introduced in 0.3.3 where visit reports do not get processed.

    Fixed accept_patient_reports transition so it calls db for readonly actions
    instead of audit.

- Allow analytics role to download messages and forms. Issue: #477

- Updated user management to show role for analytics user. Issue: #478

- Initial version of forms for Miraclefeet India


## 0.3.4

### Apr 14, 2014

- translate strings on user mgmt facilities select list #474

- Change ordering of messages export format for better readability based on
  when the state is triggered. #475

    From: Received, Sent, Pending, Scheduled Cleared, Muted
    To: Received, Scheduled, Pending, Sent, Cleared, Muted


## 0.3.3

### Apr 10, 2014

- Fixed spreadsheet keyboard navigation. #448

- Validate 'Everyone at x' for at least one valid phone number. #333

- Audit support for data records and facility data #415

    Also includes support for export of audit data as XML or CSV file.

    Note: Only new records and record edits will have an audit log entry.  So
    this means your audit log will only contain changes to records after the
    upgrade.

    Similarly browsing old revision will stop working for old records because
    they lack audit log entries.  If this is a major problem for you let us
    know and we can add backwards compatible revision browsing in the next
    release.

    This has been released as a standalone re-useable module for Node and
    browser environments: https://github.com/medic/couchdb-audit

- Added support for compact version of TextForms format #428

    In compact Textforms fields are delimited by spaces and determined by order.
    So no hashes or field keys are required like in classic TextForms format.
    If your field value has spaces in it then it must be surrounded by quotes
    unless it is the last field.

    Examples:

        REG 4165550000 John Smith
        REG "John Smith" 4165550000
    
- Include state change timestamps and patient_id in messages export #453
    
    Old Columns:

    Record UUID, Reported Date, From, Clinic Contact Name, Clinic Name,  Health
    Center Contact Name, Health Center Name, District Hospital Name, Message
    Type, Message State, Message Timestamp/Due, Message UUID, Sent By, To
    Phone, Message Body

    New Columns:

    Record UUID, Patient ID, Reported Date, Reported From, Clinic Contact Name,
    Clinic Name, Health Center Contact Name, Health Center Name, District
    Hospital Name, Message Type, Message State, Received Timestamp, Sent
    Timestamp, Pending Timestamp, Scheduled Timestamp, Cleared Timestamp, Muted
    Timestamp, Message UUID, Sent By, To Phone, Message Body

    Note: These are the default column labels and they are configurable.

- Disable facility select and show loading message until data is loaded. #452

- Updated font-awesome to 3.2.1 to get extra icons

- Fixed Help button on the spreadsheet. #455

- Fixed spreadsheet duplicate rendering when quickly switching tabs. #362 #450

- Added permissions checks to export lists functions. #456

- Fixed bug where facility spreadsheet update records when field value is
  unchanged. #457

- Fixed bug where registrations was not using db-wide unique IDs. medic-sentinel#54 

- Fixed duplicate records on ID search #430

- User Management UX refactor #385, #380, #462, #380, #379, #378, #377, #429

- Fixed bug on facilities screen where delete functions would stack up and
  inadvertantly delete a facility. #469


## 0.3.2

### Mar 11, 2014 

- fixed facilities spreadsheet bug #451 in Chrome
    
- minor user interface tweaks on deletion of facilities modal


## 0.3.1

### Mar 3, 2014 

- Fixed a bug where the facilities spreadsheet was holding focus so sending a message doesn't work. #440

- Added Bulk Messaging support, so you can send messages to multiple recipients. #333

- Fixed bug to include incoming messages in messages export. #436
    
- Fixed bug where it is possible to send a message twice by double clicking the submit button

- Fixed bug where we failed to retrieve settings on port 80 #438
    
    This was experienced when proxying to couchdb because http proxying will
    decode the URL including docid of the show parameter, so the show
    returns 404.  Solution is to always double URL encode if the show docid
    contains special characters.

- Confirm with user before deleting facility so they can't be deleted by accident. #371

- Added unique Patient ID validation support.  #411 medic-sentinel/pull/50

    Use unique('patient_id') in your registration validation rules to validate
    new form submissions that are setting the patient ID values via forms.

    Validation rules may consist of Pupil.js rules and custom rules.  These
    cannot be combined as part of the same rule.

    Not OK:        
    
        rule: "regex('[0-9]{5}') && unique('patient_id')"
    
    OK:
        
        rule: "regex('[0-9]{5}') && max(11111)"    

    If for example you want to validate that patient_id is 5 numbers and it
    is unique (or some other custom validation) you need to define two
    validation configs/separate rules in your settings. Example validation
    settings:

    ``` 
    [
      {
        property: "patient_id",
        rule: "regex('[0-9]{5}')",
        message: "Invalid: Patient ID {{patient_id}} must be 5 numbers."
      },
      {
        property: "patient_id",
        rule: "unique('patient_id')",
        message: "Invalid: Patient ID {{patient_id}} must be unique."
      }
    ]
    ```

- Added Conditional Alerts feature. #437  medic-sentinel/issue/52

    Configure the Alerts section of the App Settings to send a message when an
    incoming message meets the configured condition.
    
    
## 0.3.0-beta.39 (bugfix)

### Feb 25, 2014

- Fixed textforms whitespace parser bug when using form list field types. #431

    Textforms parser wasn't trimming space correctly on a field value, so if
    you had a list defined using those values they would never get matched.
    
    Textforms was only matching numeric values of length 2 or more, so if
    you submitted a one digit number you would not get a numeric match.
    
    Also if the value didn't match numeric or a date format then the
    whitespace was not being trimmed correctly.


## 0.3.0-beta.38 (debug) 

### Feb 13, 2014
 
- added logging calls to help debug and identify whitespace parsing bug #431


## 0.3.0-beta.37 

### Jan 21, 2014

- Fixes to user roles (@marc)
 
    Matches Transitional V2 in
    https://docs.google.com/a/medicmobile.org/spreadsheet/ccc?key=0Ao9l2yegOFn7dEJRTEw1Z3RmZm0wTEo4Nk92NjVocnc

- Added support for Kemri Muvuku Form (KEMR)

- Added exclude_cols query param to csv/xml form exports. #421
    
    For example inlude `exclude_cols=1,5` in your query parameters to
    remove the first and fifth column of an export.

-  bugfix on export query params and UX adjustments

    Made English CSV export default. SpreadsheetML can be a little buggy
    because we're using HTML entities (not valid XML).
    
    Disabled default month value in exports screen since record count does
    not reflect the export row totals displayed.  It's probably better UX to
    have the user set the date knowing they are doing something than having a
    default that doesn't make sense with the totals on the screen and having
    to guess why that is.
    
- Added timezone support to exports #394

    Render page contents first and then load the fields data since that was
    holding up the page load.
    
    Indexing _id as `uuid` in field index so you can search for
    `uuid:10366976d62ab9a31257b2fad16113ee` now and it shows up in avaialble
    fields index.  For some reason I think underscore prefixed fields do
    show up in fields listing on Lucene for some reason.

- Fixed poor loading on search help #422


- added timezone support to exports #394
        
    Now dates in the exported spreadsheet should include your locale timezone. Controlled by the `tz` query param.
    
    
- Added new Messages Export and removed message data from Forms Export

    New http endpoint `/export/messages` to get messages export. Records are
    always latest first (reverse cronological).  Message export will include
    all records (valid and invalid), the point of the messages export is to
    give you access to all your message data, including outgoing error
    messages.
            
    **Warning**: the following URLs are no longer supported:
    
    ```
    /{form}/data_records.csv
    /{form}/data_records.xml
    /form_data_records.xml
    /form_data_records.csv
    ```
    
    Use `/export/forms/{form}` path instead.
    
    **Warning**: Existing form data export format has changed.  Included UUID of
    the related record so data among the two spreadsheets (messages and form
    data) can be correlated if need be.  Also removed the message
    data/columns from form data export. A record can be found via UUID by
    using `uuid:<the uuid string>` in the search box.
    
    Changed default column name of "From" to "Reported From".  Note if this
    shouldn't change if you have an existing install since it is generated
    based on your translation settings.

```
    The NEW columns (added UUID column and removed message data):
    
    Record UUID
    Reported Date
    Reported From
    Clinic Contact Name
    Clinic Name
    Health Center Contact Name
    Health Center Name
    District Hospital Name
    [columns for form fields data depending on form]
    
    The OLD columns:
    
    Reported Date
    From
    Clinic Contact Name
    Clinic Name
    Health Center Contact Name
    Health Center Name
    District Hospital Name
    [columns for form fields data depending on form]
    Incoming Message
    Responses
    Outgoing Messages
    Scheduled Tasks
```


    
    
