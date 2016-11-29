# Medic Mobile Release Notes

## 2.9.0

_December 2016_

### Features

- Redesign of People tab to introduce patient centric workflows.
- Calculate Z-Score within app workflow form. Issue: #2915
- Transitions do not run for XForms. Issue: #2864
- CHWs should not be able to edit their own area. Issue: #2844
- Allow for people-centric SMS workflows. Issue: #2700
- Unique "add person" forms to a place. Issue: #2693
- Store GPS failure. Issue: #2670
- Progressive Web App. Issue: #2626
- Remove XML parsing and replace it with JSON views. Issue: #2432
- Lowercase all user ids. Issue: #2369
- New person and new place buttons should add person/place to the part of the hierarchy in which they are clicked. Issue: #2335
- Create default Edit Place forms that allow users to edit a family's primary contact. Issue: #2333
- Initial replication feedback. Issue: #2279
- Make it easy to add translation keys. Issue: #1333

### Bug fixes

- `db-object` fields show as editable when `readonly="true()"`. Issue: #2910
- Calling the `doc_summaries_by_id` view results in an audit record being created. Issue: #2895
- Can't create new person as primary contact to existing place. Issue: #2884
- Mute button does not work. Issue: #2878
- Cannot fully replicate dbs behind medic-api due to badly named document. Issue: #2876
- Deregister Changes callbacks. Issue: #2870
- Non admins can edit translations. Issue: #2868
- Error when completing a task. Issue: #2851
- Editing a report from a person doesn't pre-populate the person. Issue: #2845
- Forms appear on the History page when they shouldn't, based on configuration. Issue: #2837
- When I click on a report from a contact profile, I see a flash of the History tab before getting to the report view. Issue: #2834
- When resources change all icons disappear. Issue: #2830
- Use default revs_limit. Issue: #2787
- ContactsContent controller modifies doc on render. Issue: #2782
- Alerts to `reporting_unit` not working. Issue: #2779
- Correct form not displayed when going to Submit Report. Issue: #2758
- Validations and Auto-Replies not triggered for Notifications. Issue: #2755
- Sending message from Reports tab doesn't prefill the modal. Issue: #2748
- Selecting a person's Report or Task doesn't load the actual item. Issue: #2718
- select2 form fields are not being prepopulated. Issue: #2703
- Exporting Feedback crashes API. Issue: #2692
- Cannot associate a user with a place. Issue: #2683
- Missing patient ids and CHW names. Sentinel not fully running on Strong Minds instance. Issue: #2675
- Cannot update a contact's phone number without an error. Issue: #2661
- Add recipients doesn't work. Issue: #2659
- Sometimes changes feed is told the wrong ID for user doc. Issue: #2640
- Submitting a report with an invalid ref id crashes sentinel. Issue: #2636
- Always use the same pouchdb configuration. Issue: #2625
- Branch Manager is not getting forms downloaded. Issue: #2620
- Can crash API with call to /api/v1/users. Issue: #2602
- TypeError on Messages tab. Issue: #2588
- `context_by_type_freetext` view seems to run with no search term. Issue: #2584
- Once viewing a stock report, clicking the area name makes area stats disappear. Issue: #2580
- Missing option to change time unit in reporting rate analytics. Issue: #2576
- Missing "district" selector in Reporting rates Analytics in v2.x. Issue: #2575
- Rename "stock" widget to "reporting rates". Issue: #2574
- No title shown for analytics stock table. Issue: #2573
- No loader showing when loading data on analytics stock report. Issue: #2572
- No loader shown when loading locations on Analytics Stock widget. Issue: #2566
- Back button is broken on analytics stock widget. Issue: #2565
- Stock widget shows time-period selector before a place has been selected. Issue: #2564
- Icons wrong on analytics stock widget. Issue: #2563
- No text labels displayed in analytics stock widget. Issue: #2562
- Analytics stock widget breaks on error. Issue: #2561
- No loading animation is displayed when waiting for list of locations on analytics stock widget. Issue: #2559
- Analytics page should not show menu if there is only one module. Issue: #2557
- Cannot choose one of the analytics modules. Issue: #2556
- Reporting Rates has changed name to Stock Monitoring. Issue: #2555
- Analytics screen has no information on it. Issue: #2554
- By default gateway users don't have the `can_access_gateway_api` permission. Issue: #2549
- Cannot view Targets configuration. Issue: #2548
- Send message uses a badly performing API. Issue: #2547
- Document conflict on starting sentinel. Issue: #2542
- Bad error when not authed for SMS api. Issue: #2540
- Editing your own user settings wipes out security settings. Issue: #2539
- Cannot send messages to unknown numbers. Issue: #2536
- medic-api doesn't seem to correctly expose all pending messages. Issue: #2535
- Outgoing messages are not well formatted in the report view. Issue: #2532
- SMS from medic-gateway do not appear in Messages tab. Issue: #2530
- Phantom SMS message response to invalid textform message. Issue: #2525
- sentinel keeps processing the same backlog. Issue: #2521
- Errors starting sentinel with DB name other than 'medic'. Issue: #2513
- You need to restart medic-api for new translations to make it through. Issue: #2511
- API connection refused. Issue: #2476
- Login page not translated. Issue: #2466
- Language dropdown is empty when adding or editing a user. Issue: #2462
- Language select modal is blank. Issue: #2459
- Broken migrations should prevent API from starting. Issue: #2456
- Geolocation information is not exposed in JSON. Issue: #2450
- Creating user fails due to invalid `reported_date`. Issue: #2449
- App takes minutes to load a `person` dropdown. Issue: #2445
- User can't change their own password. Issue: #2440
- When switching between reports in History, the "No report selected" page appears momentarily. Issue: #2433
- \\u0000 cannot be converted to text. Issue: #2426
- The tour keeps popping up on mobile. Issue: #2423
- In select mode, clicking on a report on the LHS to check the box also marks the report as read. Issue: #2422
- DeleteDocs modifies the given array. Issue: #2417
- DeleteDocs fails if the parent's contact is null. Issue: #2416
- After clicking "delete" on the RHS of bulk delete, reports do not disappear from the LHS. Issue: #2414
- Using "select all" when attempting to bulk delete, the number of records on the RHS doesn't match the LHS. Issue: #2411
- Logout option no longer works on the MM Android app. Issue: #2407
- national-admins should be able to edit contacts. Issue: #2395
- Initial replication gets stuck on Tecno. Issue: #2394
- Cannot have more than one repeat group that creates people within the same form. Issue: #2393
- Targets tab doesn't show correct progress. Issue: #2388
- Contacts tab takes forever to load on mobile. Issue: #2378
- RangeError: Maximum call stack size exceeded. Issue: #2377
- Don't audit docs that match `_local/*`. Issue: #2366
- Fix changes proxy to support heartbeat. Issue: #2363
- .4 analytics page crashes `develop` API. Issue: #2352
- Admin can't submit report (permissions). Issue: #2351
- DeleteDoc service breaks replication. Issue: #2331
- Phones with poor internet connections get an error page when trying to update. Issue: #2328
- Navigating straight to `medic/_design/medic/_rewrite/#/configuration/user` breaks editing. Issue: #2294
- Cannot select contact after bad search. Issue: #2252
- Incoming message not attributed to contact. Issue: #2230
- Form recognized, but label in list not updated. Issue: #2215
- Forms not showing in filter. Issue: #2214
- Schedule not assigned to registration form. Issue: #2213
- In date filter for Reports tab, the selected dates are being offset by 1 day. Issue: #2185
- Exceptions when indexing (presumably) views. Issue: #2173
- Form title disappears on page reload. Issue: #2156
- User configuration UI doesn't correctly load the attached contact / locale. Issue: #2116
- Display: block in or-appearance-h2 is overriding the disabled class. Issue: #2101
- Verify/Unverify button falls out of sync with left pane after being clicked. Issue: #1939
- Place contact should be a child of the place. Issue: #1710
- Default "New Person" form doesn't allow editing the parent place. Issue: #2704

### UI/UX improvements

- Show parent place after deleting a place/person. Issue: #2936
- Clean up labels and translations. Issue: #2888
- First load: briefly displays "No people found" on the people and places tab even if you have contacts. Issue: #2835
- Add icons to forms. Issue: #2794
- Forms in Submit Report menu aren't sorted. Issue: #2760
- Reported Date is show in ms since epoch. Issue: #2699
- Add basic sync status to about page. Issue: #2415
- Display 'your place' card upon login. Issue: #2342
- Only show places you directly manage in LHS unless searching. Issue: #2339
- Lock 'Your Place' at top of left pane. Issue: #2337
- Remove all filters in Contacts. Issue: #2336
- Display "disabled for admins" message in tasks and targets page. Issue: #2292

### Performance improvements

- Make medic-audit's view generation 8-∞ times faster. Issue: #2879
- Deregister Changes callbacks. Issue: #2870
- Improve free text search views. Issue: #2853
- Admin performance on lg.app has regressed. Issue: #2744
- Improve application performance for high-utilization CHPs. Issue: #2665
- Create migration to remove obsolete ddocs. Issue: #2597
- Send message uses a badly performing API. Issue: #2547
- Consider refactoring how sentinel views are compiled. Issue: #2537
- sentinel duplicate views. Issue: #2534
- Remove XML parsing and replace it with JSON views. Issue: #2432
- Increase stability by looping over changes . Issue: #2430
- Replication since gets reset when new documents added. Issue: #2404
- Use db view pagination where possible. Issue: #2371
- Don't audit docs that match `_local/*`. Issue: #2366
- Create a client side ddoc. Issue: #2206
- Store translations in a separate doc. Issue: #1706
- Remove empty parents migration scalability. Issue: #2629

## 2.8.4

_November 30, 2016_

### Bug fixes

- Debounce form submissions to stop duplicate submissions. Issue: #2909

## 2.8.3

_November 9, 2016_

### Performance improvements

- Remove traffic statistics collection. Issue: #2886

## 2.8.2

_October 13, 2016_

### Bug fixes

- Ensure PouchDB doesn't mis-label TECNO phones as devices running Safari. Issue: #2797

## 2.8.1

_October 10, 2016_

### Bug fixes

- If initial sync fails without syncing anything subsequent syncs get no results. Issue: #2770
- Initial sync fails if server doesn't respond within 30 seconds. Issue: #2771
- Targets tab is blank on first access. Issue: #2739

### Performance improvements

- Adding a space to a contact search term performs poorly. Issue: #2769
- Local DB grows without limit. Issue: #2434

## 2.8.0

_August 29, 2016_

### Features

- Pass user's info to rule to customize Tasks per user type or location. Issue: #2408
- Add context to target types and goals. Issue: #2409
- Update default translations
- Add ageInDays and ageInMonths functions to the XML forms context utilities. Issue: #2650
- Users can now only access an optionally configured number of hierarchy levels below their facility. Issue: #2648

### Bug fixes

- Android back button doesn't work as expected. Issue: #2600
- In date filter for Reports tab, the selected dates are being offset by 1 day. Issue: #2185
- 'New Contact' option does not appear without a search. Issue: #2516
- Place contact should be a child of the place. Issue: #1710
- Geolocation information is not included in submitted form. Issue: #2450
- Cannot update a contact's phone number without an error. Issue: #2420

## 2.7.3

_July 18, 2016_

### Bug fixes

- Remove maxSockets limit to allow more concurrent connections. Issue: #2492

## 2.7.2

_July 11, 2016_

### Bug fixes

- Connection refused when trying to load app. Issue: #2476

## 2.7.1

_July 4, 2016_

### Bug fixes

- Creating user via fails due to invalid reported_date. Issue: #2449

### Performance improvements

- App takes minutes to load a person dropdown. Issue: #2445
- Cannot load Configuration Users page. Issue: #2444

## 2.7.0

_June 8, 2016_

### Features

- Bulk delete reports. Issue: #1000

### Bug fixes

- Report list item summaries aren't translated. Issue: #2100
- Fix form type filter. Issue: #1409

### Performance improvements

- Replication performance. Issue: #2286
- Improve search performance. Issue: #2302
- Don't fetch form titles for each Contact report. Issue: #2300
- Only fetch relevant data for the Users service. Issue: #2262
- Remove clinics from the Facility filter dropdown. Issue: #2218
- Optimize admin bandwidth concerns. Issue: #2211
- We request facilities from the server over and over again. Issue: #2210
- Don't audit _local docs. Issue: #2366
- All requests to CouchDB time out after 10 seconds. Issue: #2325
- Long delay loading contact dropdowns. Issue: #2326

## 2.6.3

_May 23, 2016_

- "console not defined" error when loading page. Issue: #2277
- Pouch doesn't update seq unless something has changed. Issue: #2288
- Snackbar showing all the time. Issue: #2306
- Support external_id property on user-settings docs. Issue: #2310

## 2.6.2

_May 6, 2016_

- Update PouchDB to improve replication reliability and performance. Issue: #2134 #2167
- When editing a CHP Area, previously set values for CHP, Branch, and Supervisor do not show up. Issue: #2223
- Dropdowns in CHP Area create and edit forms have no blank option. Issue: #2227
- allow-new appearance in Enketo doesn't make the "New" option appear. Issue: #2251
- Improve performance of Enketo db-object-widget. Issue: #2161
- Ensure roles are always available on user-settings. Issue: #2199
- Form type filter doesn't include all forms. Issue: #1409
- Added APIs for creating Users, People, and Places. Issue: #2046

## 2.6.1

_April 21, 2016_

- User's fullname is not showing up in /configuration/users. Issue: #2200
- Deleted documents cause sentinel log spam. Issue: #1999
- Disable nools for unrestricted users. Issue: medic-projects#149
- Update libphonenumber and use strict validation. Issue: #2159 #2196
- Contacts export response garbled. Issue: #2187

## 2.6.0

_April 5, 2016_

This release contains breaking changes from 0.x versions. Updating from 0.x versions may result in the application no longer operating as expected.

- The app can now be used offline and synced back to the server later.
- Added an android app for accessing the webapp from mobile.
- Added Tasks feature for rich event scheduling.
- Forms can now be provided in XForm format for rich form UIs.
- Added a configurable Target analytics module.

## 0.4.13

_October 21, 2016_

- Option to set birthdate using days old instead of weeks. Issue: #2756
- The week/month is off by 2 in the Reporting Rates analytics dashboard. Issue: #2781
- Remove socket limit in medic-api. Issue: #2632

## 0.4.12

_July 21, 2016_

- Fixed bug in reporting rates for weekly time unit. #2429
- Log warnings in sentinel when ID collisions happen. #1898
- Support integration with [medic-gateway](https://github.com/medic/medic-gateway) for sending and receiving SMS medic-api#69

## 0.4.11

_February 4, 2016_

- Security fix for leaking auth info.

## 0.4.10

_Nov 16, 2015_

- Added support for Outgoing Deny List, a comma separated list of phone numbers
  or strings to deny outgoing service to. #750

- Fixed bug in records export. #1273

- Fixed bugs in uniqueWithin validation. medic-sentinel#74

- Added link to Help page in main menu.

## 0.4.9

_Aug 26, 2015_

- Fixed bug on node 0.12 in felix-couchdb. #1145

- Improved error handling when notifications (start/stop) configs are
  misconfigured. #1144

- Fixed bug in `exists` validation where it fails on some unicode characters. #1147

- Fixed Reporting Rates interface that was neglected and broken. #1030

- Fixed bug in exporting data by date, it's now inclusive. #1104

## 0.4.8

_July 14, 2015_

- Added SMS parser fixes from dev branch:
   
  - parse string fields with exclamation marks
  - compact textforms format handles quotes in quotes

- Fixed export bug when using lowercase form codes. Please re-upload your forms
  so they are formatted correctly. #998

- Fixed bug where exporting yields same result with or without date
  filter. #1059, #1031

## 0.4.7

_June 16, 2015_

- Fixed ODK forms list bug when the list is empty. Issue #886

- Fixed compact textforms parser bug with exclamation points. Issue #989

- Fixed bug in compact textforms parser we ignored fields with uppercase
  letters in the key of the form definition.  Issue #991

- Fixed bug when creating record with empty message. Issue #990

- Moved raw message to bottom of report body.  Issue: #927


## 0.4.6

_June 4, 2015_

- Improved boolean expression evaluation in registration configuration.

## 0.4.5

_May 28, 2015_

- Fixed bug in schedules editor for LMP (last menstrual period) based
  schedules. #973
    
- Initial support for messages, records and forms API.  See
  https://github.com/medic/medic-api/blob/master/API_v1.md

## 0.4.4

_May 21, 2015_

- Added support for a new messages parser we're calling Javarosa prefixed with
  the `J1` format code. 

## 0.4.3

_February 26, 2015_

### Features

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

### Upgrade Notes

- CouchDB Lucene >= 1.0.2

- Gardener >= 1.1.0 

- New [Nginx configuration](https://github.com/medic/medic-os/blob/3aedf0622eb0669aee2e5bbfba95a42faf05b9da/platform/packages/medic-core/settings/medic-core/nginx/nginx.conf), close or redirect port 5984, proxy all requests through medic-api.


## 0.4.2

_September 4, 2014_

- Fixed bug: When searching for a patient identifier using the free-text search feature, results were not returned properly. Index the field appropriately.

## 0.4.1

_July 31, 2014_

- Minor UI clean up.

- Allow hash symbol to separate form code and data in structured textform message.

- Modified build to bundle npm dependencies with attached node modules.

## 0.4.0

_July 10, 2014_

### New Features

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

### Bug fixes

- Fixed bug stopping district admins from being able to delete documents. #509

- Corrected language Nepalese to Nepali

- Fixed too many requests for app_settings #511

- Fixed saving user password, was getting reset/wiped #509 

- Render facilities controls on all facilities tabs. #338

### Deprecated and Backwards Incompatible changes

- deprecated `exclude_cols` parameter for export integrations. Migrate 
  applications to use the `columns` parameter instead.

- No forms are included by default, you must upload your forms. As usual
  configuration (settings and forms) persists through upgrades.


## 0.3.11

_June 19, 2014_

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

_June 12, 2014_

- updated intrahealth-senegal forms


## 0.3.9

_May 22, 2014_

- fixed a bug in settings parser, to conform to the latest app-settings
  changes, otherwise configs never get triggered.

## 0.3.8

_May 22, 2014_

- fixed bug in messages export filters to include all data records,
  unstructured messages were being ignored. #502

- added support for app-settings kanso package.
        
    Saving settings in dashboard was too slow for use because entire ddoc was
    being updated.  Using app-settings API fixes that.


## 0.3.7

_May 13, 2014_

- Modified KEMRI form fields to be ordered the same as KEMR form.


## 0.3.6

_April 28, 2014_

- Fixed bug in updating duplicate scheduled reports #483


## 0.3.5

_April 16, 2014_

- Major bug fix that was introduced in 0.3.3 where visit reports do not get processed.

    Fixed accept_patient_reports transition so it calls db for readonly actions
    instead of audit.

- Allow analytics role to download messages and forms. Issue: #477

- Updated user management to show role for analytics user. Issue: #478

- Initial version of forms for Miraclefeet India


## 0.3.4

_April 14, 2014_

- translate strings on user mgmt facilities select list #474

- Change ordering of messages export format for better readability based on
  when the state is triggered. #475

    From: Received, Sent, Pending, Scheduled Cleared, Muted
    To: Received, Scheduled, Pending, Sent, Cleared, Muted


## 0.3.3

_April 10, 2014_

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

_March 11, 2014 _

- fixed facilities spreadsheet bug #451 in Chrome
    
- minor user interface tweaks on deletion of facilities modal


## 0.3.1

_March 3, 2014 _

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

_February 25, 2014_

- Fixed textforms whitespace parser bug when using form list field types. #431

    Textforms parser wasn't trimming space correctly on a field value, so if
    you had a list defined using those values they would never get matched.
    
    Textforms was only matching numeric values of length 2 or more, so if
    you submitted a one digit number you would not get a numeric match.
    
    Also if the value didn't match numeric or a date format then the
    whitespace was not being trimmed correctly.


## 0.3.0-beta.38 (debug) 

_February 13, 2014_
 
- added logging calls to help debug and identify whitespace parsing bug #431


## 0.3.0-beta.37 

_January 21, 2014_

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
